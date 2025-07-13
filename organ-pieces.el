;; -*- lexical-binding: t; -*-

(require 'cl-lib)
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

(defun organ--refresh-pieces (&optional callback)
  "Fetch the list of pieces from the API, store it in `organ--pieces-cache`, and execute CALLBACK if provided
Each cell in the cache has the form (\"composer - title\" . piece-id)."
  (organ--get-request "/pieces/"
   :success (cl-function
             (lambda (&key data &allow-other-keys)
               (setq organ--pieces-cache
                     (mapcar #'organ--format-piece data))
               (setq organ--composers-cache
                     (delete-dups (mapcar #'organ--extract-composer data)))
               (message "Fetched and cached pieces")
               (when callback
                 (funcall callback))))))

(defun organ--ensure-pieces (callback)
  "Ensure `organ--pieces-cache` is populated. If not, call `organ--refresh-pieces` and then execute CALLBACK."
  (if organ--pieces-cache
      (funcall callback)
    (progn
      (message "Fetching pieces...")
      (organ--refresh-pieces callback)
      (ignore))))

(defun organ--select-piece ()
  "Prompt the user to select a piece and return its ID."
  (interactive)
  (organ--ensure-pieces
   (lambda ()
     (let* ((completion-table (mapcar #'car organ--pieces-cache))
            (selected-piece (completing-read "Select a piece: " completion-table nil t)))
       (message "Selected piece ID: %s" (cdr (assoc selected-piece organ--pieces-cache)))
       (cdr (assoc selected-piece organ--pieces-cache))))))

(defun organ-add-piece ()
  "Interactively add a new piece, using an API request"
  (interactive)
  (organ--ensure-pieces
   (lambda ()
     (let* ((title (read-string "Enter piece title: "))
            (composer (completing-read "Enter composer: " organ--composers-cache nil nil))
            (duration-input (read-string "Enter duration: "))
            (duration (if (string-empty-p duration-input) nil (string-to-number duration-input)))
            (notes (read-string "Enter notes: ")))
       (organ--post-request "/pieces/"
        :data (json-encode `(("title" . ,title)
                             ("composer" . ,composer)
                             ("duration" . ,duration)
                             ("notes" . ,notes)))
        :success (cl-function
                  (lambda (&key data &allow-other-keys)
                    (message "Piece added successfully: %s" (alist-get 'id data)))))
       (organ--refresh-pieces)))))

(defun organ--delete-piece-by-id (id)
  "Delete the piece with the given ID, using an API request"
  (organ--delete-request
   (format "/pieces/%d" id)
   :success
   (cl-function
    (lambda (&key data &allow-other-keys)
      (message "Piece %d deleted" id)))))

(defun organ-delete-piece ()
  "Interactively delete a piece"
  (interactive)
  (organ--delete-piece-by-id (organ--select-piece))
  (organ--refresh-pieces))
 
;; TODO: list pieces, in a table with #times performed, perhaps date last performed
;; show gigs when each piece performed

(provide 'organ-pieces)
