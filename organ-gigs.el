;; -*- lexical-binding: t; -*-

(require 'cl-lib)
(require 'organ-api)
(require 'organ-churches)
(require 'organ-pieces)

(defun organ--select-role ()
  "Prompt the user to select a role for a piece."
  (let ((roles '("Prelude" "Offertory" "Postlude" "Other")))
    (completing-read "Select role: " roles nil t)))

(defun organ--select-piece-and-role ()
  "Prompt the user to select a single piece and associated role"
  (let ((piece-id (organ--select-piece))
        (role (organ--select-role)))
    (organ--log "in select-piece-and-role piece-id is %s" piece-id)
    `((piece_id . ,piece-id) (role . ,role))))

(defun organ--select-pieces-and-roles ()
  "Prompt the user to select pieces and their associated roles."
  (interactive)
  (let (selected-pieces)
    (while (y-or-n-p "Do you want to add another piece?")
      (push (organ--select-piece-and-role) selected-pieces))
    (or selected-pieces '())))

(defun organ--simplify-pieces (gig-pieces)
  "Transform full gig-piece objects into simplified (piece_id . ID) format."
  (mapcar (lambda (entry)
            (let* ((piece (alist-get 'piece entry))
                   (role (alist-get 'role entry))
                   (piece-id (alist-get 'id piece)))
              `((piece_id . ,piece-id)
                (role . ,role))))
          gig-pieces))

(defun organ--read-or-nil (msg)
  "Prompt the user for input with message MSG
Return the string, or nil if string is empty"
  (interactive)
  (let ((input (read-string msg)))
    (if (string= input "") nil input)))

(defun organ-add-gig ()
  "Interactively add a new gig."
  (interactive)
  (organ--ensure-churches
   (organ--ensure-pieces
    (let* ((date (org-read-date nil nil nil "Select gig date: "))
           (church-id (organ--select-church))
           (fee (organ--read-or-nil "Fee: "))
           (occasion (read-string "Occasion: "))
           (pieces-and-roles (organ--select-pieces-and-roles))
           (payload (json-encode `((date . ,date)
                                   (church_id . ,church-id)
                                   (fee . ,(if (string= fee "") nil fee))
                                   (occasion . ,occasion)
                                   (pieces . ,(vconcat pieces-and-roles))))))
      (organ--log "Sending payload: %s" payload)
      (organ--post-request "/gigs/"
       :data payload
       :success
       (organ--callback data
        (message "Gig added successfully: %s" (alist-get 'id data))
        (organ-gigs-refresh)))))))

(defun organ-gigs ()
  "Fetch and display the list of gigs in a separate buffer."
  (interactive)
  (organ--get-request "/gigs/"
   :success
   (organ--callback data
    (let ((gigs (append data nil))
          (buffer (get-buffer-create "*Organ Gigs*")))
      (with-current-buffer buffer
        (read-only-mode -1)
        (erase-buffer)
        (organ-gigs-mode)
        (setq tabulated-list-entries (organ--gigs-list-entries gigs))
        (tabulated-list-print t)
        (organ--gigs-set-faces)
        (switch-to-buffer buffer))))))

(defun organ-gigs-refresh ()
  "Refresh the displayed list of gigs."
  (interactive)
  (organ--get-request "/gigs/"
   :success
   (organ--callback data
    (let ((gigs (append data nil)))
      (setq tabulated-list-entries (organ--gigs-list-entries gigs))
      (tabulated-list-print t)
      (organ--gigs-set-faces)))))

(defun organ--gigs-list-entries (gigs)
  "Convert GIGS to tabulated list entries."
  (mapcar
   (lambda (gig)
     (let ((id (alist-get 'id gig))
           (date (alist-get 'date gig))
           (church (alist-get 'name (alist-get 'church gig)))
           (occasion (or (alist-get 'occasion gig) ""))
           (fee (if (alist-get 'fee gig)
                    (format "%3d" (alist-get 'fee gig))
                  "")))
       (list id (vector date church occasion fee))))
   gigs))

(defun organ--gigs-set-faces ()
  "Set row faces based on the date of the gigs."
  (save-excursion
    (read-only-mode -1)
    (goto-char (point-min))
    (while (not (eobp))
      (let ((date-cell (aref (tabulated-list-get-entry) 0)))
        (when date-cell
          (let* ((date (date-to-time (format "%s" date-cell)))
                 (now (current-time)))
            (message "date-cell: %s" date-cell)
            (message "date: %s" date)
            (message "now: %s" now)
            (when (time-less-p now date)
              (add-text-properties (line-beginning-position) (line-end-position)
                                   '(face 'font-lock-function-name-face))))))
      (forward-line 1))))

(define-derived-mode organ-gigs-mode
  tabulated-list-mode "Organ gigs"
  "Major mode for displaying organ gigs"
  (setq tabulated-list-format [("Date" 15 t)
                               ("Church" 35 t)
                               ("Occasion" 25 t)
                               ("Fee" 5 t)]
        tabulated-list-padding 2
        tabulated-list-sort-key (cons "Date" t))
  (add-hook 'tabulated-list-revert-hook #'organ-gigs-refresh nil t)
  (tabulated-list-init-header))

(define-derived-mode organ-gig-pieces-mode
  tabulated-list-mode "Organ gig pieces"
  "Major mode for displaying pieces for organ gigs"
  (setq tabulated-list-format [("Role" 10 t)
                               ("Composer" 20 t)
                               ("Title" 30 t)
                               ("Duration" 8 t)
                               ("Notes" 15 t)]
        tabulated-list-padding 2
        tabulated-list-sort-key (cons "Role" nil))
  (tabulated-list-init-header))

(defun organ--gig-pieces-entries (gig-pieces)
  "Convert PIECES to tabulated list entries"
  (cl-loop for gig-piece across gig-pieces
           for id from 0
           collect (let* ((role (alist-get 'role gig-piece))
                          (piece (alist-get 'piece gig-piece))
                          (piece-data (organ--piece-data-list piece)))
                     (list id (apply 'vector (cons role piece-data))))))

(defun organ--display-gig-pieces (&optional id)
  "Display pieces for the selected gig in a separate buffer."
  (interactive)
  (let ((gig-id (or id (tabulated-list-get-id))))
    (organ--get-request (format "/gigs/%d" gig-id)
     :success
     (organ--callback data
      (let* ((gig (append data nil))
             (church (alist-get 'name (alist-get 'church gig)))
             (date (alist-get 'date gig))
             (gig-pieces (alist-get 'gig_pieces gig))
             (buf-title (format "*Pieces for %s on %s*" church date))
             (buffer (get-buffer-create buf-title)))
        (organ--log "returned gig for id %d is %s" gig-id gig)
        (with-current-buffer buffer
          (organ-gig-pieces-mode)
          (setq tabulated-list-entries (organ--gig-pieces-entries gig-pieces))
          (organ--log (format "gig-pieces is %S" gig-pieces))
          (organ--log (format "tabulated-list-entries is %S" tabulated-list-entries))
          (setq-local this-gig gig)
          (tabulated-list-print t)
          (display-buffer buffer)))))))

(defun organ--add-piece-to-gig ()
  "Add piece to the gig currently displayed in the gig-pieces buffer"
  (interactive)
  (organ--ensure-pieces
   (let* ((id (alist-get 'id this-gig))
          (date (alist-get 'date this-gig))
          (church-id (alist-get 'id (alist-get 'church this-gig)))
          (old-pieces (organ--simplify-pieces (alist-get 'gig_pieces this-gig)))
          (pieces-and-roles (cons (organ--select-piece-and-role) old-pieces))
          (fee (alist-get 'fee this-gig))
          (occasion (alist-get 'occasion this-gig))
          (payload (json-encode `((date . ,date)
                                  (church_id . ,church-id)
                                  (pieces . ,(vconcat pieces-and-roles))
                                  (fee . ,fee)
                                  (occasion . ,occasion)))))
     (organ--log "old-pieces: %S (type: %s)"
                 old-pieces
                 (type-of old-pieces))
     (organ--log "Sending payload: %s" payload)
     (organ--put-request (format "/gigs/%d" id)
      :data payload
      :success
      (organ--callback data
       (message "Piece added to gig")
       (organ--display-gig-pieces id))))))

(defun organ--remove-piece-from-gig ()
  "Remove piece from the gig currently displayed in the gig-pieces buffer"
  (interactive)
  (let* ((id (tabulated-list-get-id)))
    (when (yes-or-no-p (format "Are you sure you want to delete piece %d? " id))
      (let* ((gig-id (alist-get 'id this-gig))
             (date (alist-get 'date this-gig))
             (church-id (alist-get 'id (alist-get 'church this-gig)))
             (old-pieces (alist-get 'gig_pieces this-gig))
             (new-pieces (vconcat (seq-subseq old-pieces 0 id)
                                  (seq-subseq old-pieces (1+ id) (length old-pieces))))
             (pieces-and-roles (organ--simplify-pieces new-pieces))
             (fee (alist-get 'fee this-gig))
             (occasion (alist-get 'occasion this-gig))
             (payload (json-encode `((date . ,date)
                                     (church_id . ,church-id)
                                     (pieces . ,(vconcat pieces-and-roles))
                                     (fee . ,fee)
                                     (occasion . ,occasion)))))
        (organ--log "old-pieces: %S (type: %s)"
                    old-pieces
                    (type-of old-pieces))
        (organ--log "Sending payload: %s" payload)
        (organ--put-request (format "/gigs/%d" gig-id)
         :data payload
         :success
         (organ--callback data
                          (message "Piece deleted from gig")
                          (organ--display-gig-pieces gig-id)))))))

(define-key organ-gig-pieces-mode-map (kbd "a") 'organ--add-piece-to-gig)
(define-key organ-gig-pieces-mode-map (kbd "d") 'organ--remove-piece-from-gig)

(defun organ--delete-gig ()
  "Delete the selected gig, sending request to the API"
  (interactive)
  (let* ((id (tabulated-list-get-id)))
    (when (yes-or-no-p (format "Are you sure you want to delete gig %d? " id))
    (organ--delete-request
     (format "/gigs/%d" id)
     :success
     (organ--callback data
      (message "Gig %s deleted successfully" id)
      (organ-gigs-refresh))))))

(defun organ--edit-gig (&optional id)
  "Edit the selected gig, sending updated data to the API."
  (interactive)
  (organ--ensure-churches
   (organ--ensure-pieces
    (let ((gig-id (or id (tabulated-list-get-id))))
      (organ--get-request
       (format "/gigs/%d" gig-id)
       :success
       (organ--callback
        data
        (let* ((gig (append data nil))
               (orig-date (date-to-time (format "%s" (alist-get 'date gig))))
               (date (org-read-date nil nil nil "Edit gig date: " orig-date))
               (church-id (organ--select-church (alist-get 'church gig)))
               (pieces (organ--simplify-pieces (alist-get 'gig_pieces gig)))
               ;; (pieces (organ--edit-pieces-and-roles (alist-get 'gig_pieces gig)))
               ;; (pieces-and-roles (alist-get 'gig_pieces gig))
               ;; (pieces (if pieces-and-roles pieces-and-roles '[]))
               (fee-raw (alist-get 'fee gig))
               (fee-old (if fee-raw (format "%.0f" fee-raw) nil))
               (fee (read-string "Edit gig fee: " fee-old))
               (occasion (read-string "Edit occasion: " (or (alist-get 'occasion gig) "")))
               (payload (json-encode `((id . ,id)
                                       (date . ,date)
                                       (church_id . ,church-id)
                                       (pieces . ,(vconcat pieces))
                                       (fee . ,(if (string= fee "") nil fee))
                                       (occasion . ,occasion)))))
          (organ--log (format "original: %s" gig))
          (organ--log (format "new: %s" payload))
          (organ--put-request
           (format "/gigs/%d" gig-id)
           :data payload
           :success
           (organ--callback
            data
            (message "Gig edited successfully")
            (organ-gigs-refresh))))))))))

(defun organ--edit-pieces-and-roles (current-pieces)
  "Edit pieces and roles with CURRENT-PIECES as default values."
  (let (selected-pieces)
    (dolist (gig-piece (append current-pieces nil))
      (let* ((piece (alist-get 'piece gig-piece))
             (role (alist-get 'role gig-piece))
             (completion-table (mapcar #'car organ--pieces-cache))
             (default-title (alist-get 'title piece))
             (selected-piece (completing-read "Edit piece: " completion-table nil t nil nil default-title))
             (piece-id (cdr (assoc selected-piece organ--pieces-cache)))
             (selected-role (completing-read "Edit role: " '("Prelude" "Offertory" "Postlude" "Other") nil t nil nil role)))
        (push `(("piece_id" . ,piece-id) ("role" . ,selected-role)) selected-pieces)))
    selected-pieces))

;;;; Key bindings

(define-key organ-gigs-mode-map (kbd "RET") 'organ--display-gig-pieces)
(define-key organ-gigs-mode-map (kbd "a") 'organ-add-gig)
(define-key organ-gigs-mode-map (kbd "d") 'organ--delete-gig)
(define-key organ-gigs-mode-map (kbd "e") 'organ--edit-gig)
(define-key organ-gigs-mode-map (kbd "g") 'organ-gigs-refresh)

;; TODO
;; - Highlight currently selected gig in tabulated list
;; - Different color for upcoming gigs

(provide 'organ-gigs)
