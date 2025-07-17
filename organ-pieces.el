;; -*- lexical-binding: t; -*-

(require 'cl-lib)
(require 'tablist)
(require 'organ-api)

(defvar organ--pieces-cache nil
  "Cache for storing the list of pieces fetched from the API.")

(defvar organ--composers-cache nil
  "Cache for storing the list of composers")

(defun organ--format-piece (piece)
  (let ((title (alist-get 'title piece))
        (composer (alist-get 'composer piece))
        (id (alist-get 'id piece)))
    (cons (format "%s - %s" composer title) id)))

(defun organ--extract-composer (piece)
  "Return the composer for the piece provided"
  (alist-get 'composer piece))

(defun organ--populate-caches (pieces)
  "Populate the caches for pieces and composers"
  (setq organ--pieces-cache (mapcar #'organ--format-piece pieces))
  (setq organ--composers-cache (delete-dups (mapcar #'organ--extract-composer pieces))))

(defun organ--refresh-pieces (&optional callback)
  "Fetch the list of pieces from the API, store it in `organ--pieces-cache`, and execute CALLBACK if provided
Each cell in the cache has the form (\"composer - title\" . piece-id)."
  (organ--get-request "/pieces/"
   :success
   (organ--callback data
    (organ--populate-caches (append data nil))
    (organ--log "Fetched and cached pieces")
    (when callback
      (funcall callback)))))

(defmacro organ--ensure-pieces (&rest body)
  "Ensure `organ--pieces-cache` is populated.
If not, call `organ--refresh-pieces` and then execute forms in BODY."
  `(let ((callback (lambda () ,@body)))
     (if organ--pieces-cache
         (funcall callback)
       (progn
         (organ--log "Fetching pieces...")
         (organ--refresh-pieces callback)
         (ignore)))))

(defun organ--select-piece ()
  "Prompt the user to select a piece and return its ID."
  (interactive)
  (organ--ensure-pieces
   (let* ((completion-table (mapcar #'car organ--pieces-cache))
          (selected-piece (completing-read "Select a piece: " completion-table nil t)))
     (organ--log "Selected piece ID: %s" (cdr (assoc selected-piece organ--pieces-cache)))
     (cdr (assoc selected-piece organ--pieces-cache)))))

(defun organ-add-piece ()
  "Interactively add a new piece, using an API request"
  (interactive)
  (organ--ensure-pieces
   (let* ((title (read-string "Enter piece title: "))
          (composer (completing-read "Enter composer: " organ--composers-cache nil nil))
          (duration-input (read-string "Enter duration (sec): "))
          (duration (if (string-empty-p duration-input) nil (string-to-number duration-input)))
          (notes (read-string "Enter notes: "))
          (payload (json-encode `((title . ,title)
                                  (composer . ,composer)
                                  (duration . ,duration)
                                  (notes . ,notes)))))
     (organ--post-request
      "/pieces/"
      :data payload
      :success
      (organ--callback data
                       (organ--log "Piece added successfully: %s" (alist-get 'id data))
                       (organ--refresh-pieces))))))

(defun organ--edit-piece (&optional id)
  "Edit the selected piece, sending updated data to the API."
  (interactive)
  (organ--ensure-pieces
   (let ((piece-id (or id (tabulated-list-get-id))))
     (organ--get-request
      (format "/pieces/%d" piece-id)
      :success
      (organ--callback
       data
       (let* ((piece (append data nil))
              (title (read-string "Edit piece title: " (alist-get 'title piece)))
              (composer (completing-read "Edit composer: " organ--composers-cache nil nil (alist-get 'composer piece)))
              (duration-prev (alist-get 'duration piece))
              (duration-str (if duration-prev (number-to-string duration-prev) ""))
              (duration-input (read-string "Edit duration (sec): " duration-str))
              (duration (if (string-empty-p duration-input) nil (string-to-number duration-input)))
              (notes (read-string "Edit notes: " (alist-get 'notes piece)))
              (payload (json-encode `((id . ,piece-id)
                                      (title . ,title)
                                      (composer . ,composer)
                                      (duration . ,duration)
                                      (notes . ,notes)))))
         (organ--log (format "Edit piece payload: %s" payload))
         (organ--put-request
          (format "/pieces/%d" piece-id)
          :data payload
          :success
          (organ--callback
           data
           (message "Piece edited successfully")
           (organ--refresh-pieces)))))))))


(defun organ--delete-piece-by-id (id)
  "Delete the piece with the given ID, using an API request"
  (organ--delete-request (format "/pieces/%d" id)
   :success
   (organ--callback data
    (message "Piece %d deleted" id)
    (organ--refresh-pieces))))

(defun organ-delete-piece ()
  "Interactively delete a piece"
  (interactive)
  (organ--delete-piece-by-id (organ--select-piece))
  (organ--refresh-pieces))

(defun organ--delete-piece ()
  "Delete the selected piece, sending request to the API"
  (interactive)
  (let* ((id (tabulated-list-get-id))
         (name (aref (tabulated-list-get-entry) 1)))
    (when (yes-or-no-p (format "Are you sure you want to delete %s? " name))
      (organ--delete-piece-by-id id)
      (organ-pieces))))

(define-derived-mode organ-pieces-mode
  tabulated-list-mode "Organ pieces"
  "Major mode for displaying organ pieces"
  (setq tabulated-list-format [("Composer" 24 t)
                               ("Title" 40 t)
                               ("Duration" 8 t)
                               ("Notes" 15 t)]
        tabulated-list-padding 2
        tabulated-list-sort-key (cons "Composer" nil))
  (add-hook 'tabulated-list-revert-hook #'organ-pieces nil t)
  (tablist-minor-mode)
  (tabulated-list-init-header))

(defun organ--format-duration (seconds)
  "Convert SECONDS (integer) to a string in the format min:sec"
  (if (null seconds)
      ""
    (let ((minutes (/ seconds 60))
          (secs (% seconds 60)))
      (format "%d:%02d" minutes secs))))

(defun organ--piece-data-list (piece)
  "Convert PIECE to a list (composer, title, duration, notes)"
  (let ((composer (alist-get 'composer piece))
         (title (alist-get 'title piece))
         (duration (organ--format-duration (alist-get 'duration piece)))
         (notes (or (alist-get 'notes piece) "")))
    (list composer title duration notes)))

(defun organ--extract-list-entry (piece)
  "Convert PIECE to an entry for a tabulated list"
  (let ((id (alist-get 'id piece))
        (data-list (organ--piece-data-list piece)))
    (list id (apply 'vector data-list))))

(defun organ--pieces-list-entries (pieces)
  "Convert PIECES to tabulated list entries."
  (mapcar #'organ--extract-list-entry pieces))

(defun organ-pieces ()
  "Fetch and display the list of organ pieces in a separate buffer"
  (interactive)
  (organ--get-request "/pieces/"
   :success
   (organ--callback data
    (let ((buffer (get-buffer-create "*Organ Pieces*"))
          (pieces (append data nil)))
      (with-current-buffer buffer
        (organ-pieces-mode)
        (setq tabulated-list-entries (organ--pieces-list-entries pieces))
        (organ--populate-caches pieces)
        (tabulated-list-print t)
        (switch-to-buffer buffer))))))

(defun organ--display-performances (&optional id)
  "Display performances for the selected piece in a separate buffer."
  (interactive)
  (let ((piece-id (or id (tabulated-list-get-id))))
    (organ--get-request
     (format "/pieces/%d/gigs" piece-id)
     :success
     (organ--callback
      data
      (let* ((gigs (append data nil))
             (buf-title "*Performances*")
             (buffer (get-buffer-create buf-title)))
        (organ--log "returned gigs for %d is %s" piece-id gigs)
        (with-current-buffer buffer
          (organ-performances-mode)
          (setq tabulated-list-entries (organ--performances-entries gigs))
          (tabulated-list-print t)
          (display-buffer buffer)))))))

(defun organ--performances-entries (gigs)
  "Convert GIGS to tabulated list entries"
  (mapcar #'organ--performance-entry gigs))

(defun organ--performance-entry (gig)
  "Convert GIG to an entry for a tabulated list"
  (let* ((id (alist-get 'id gig))
         (date (alist-get 'date gig))
         (church (alist-get 'church gig))
         (church-name (alist-get 'name church))
         (occasion (alist-get 'occasion gig)))
    (list id (apply 'vector (list date church-name occasion)))))

(define-derived-mode organ-performances-mode
  tabulated-list-mode "Organ performances"
  "Major mode for displaying performances of a particular piece"
  (setq tabulated-list-format [("Date" 12 t)
                               ("Church" 35 t)
                               ("Occasion" 20 t)]
        tabulated-list-padding 2
        tabulated-list-sort-key (cons "Date" t))
  (tablist-minor-mode)
  (tabulated-list-init-header))

;; TODO: when piece selected, show gigs when each piece performed
;; TODO: edit a piece (by typing e in organ-pieces list)
;; - show date last performed
;; - highlight color based on date last performed

(define-key organ-pieces-mode-map (kbd "a") 'organ-add-piece)
(define-key organ-pieces-mode-map (kbd "d") 'organ--delete-piece)
(define-key organ-pieces-mode-map (kbd "e") 'organ--edit-piece)
(define-key organ-pieces-mode-map (kbd "RET") 'organ--display-performances)

(provide 'organ-pieces)
