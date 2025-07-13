;; -*- lexical-binding: t; -*-

(require 'cl-lib)
(require 'organ-api)
(require 'organ-churches)
(require 'organ-pieces)

(defvar organ--gigs-cache nil
  "Variable to store the fetched gigs data.")

(defun organ--refresh-gigs (&optional callback)
  "Fetch the list of gigs from the API, store it in `organ--gigs-cache`, and execute CALLBACK if provided."
  (organ--get-request "/gigs/"
   :success
   (cl-function
    (lambda (&key data &allow-other-keys)
      (setq organ--gigs-cache (append data nil))
      (message "Fetched and cached gigs")
      (when callback
        (funcall callback))))))

(defun organ--ensure-gigs (callback)
  "Ensure `organ--gigs-cache` is populated. If not, call `organ--refresh-gigs` and then execute CALLBACK."
  (if organ--gigs-cache
      (funcall callback)
    (progn
      (message "Fetching gigs...")
      (organ--refresh-gigs callback)
      (ignore))))


(defun organ--select-role ()
  "Prompt the user to select a role for a piece."
  (let ((roles '("PRELUDE" "OFFERTORY" "POSTLUDE" "OTHER")))
    (completing-read "Select role: " roles nil t)))

(defun organ--select-pieces-and-roles ()
  "Prompt the user to select pieces and their associated roles."
  (let (selected-pieces)
    (while (yes-or-no-p "Do you want to add another piece?")
      (let* ((piece-id (organ--select-piece))
             (role (organ--select-role)))
        (push `(("piece_id" . ,piece-id) ("role" . ,role)) selected-pieces)))
    selected-pieces))

(defun organ-add-gig ()
  "Interactively add a new gig."
  (interactive)
  (let ((date (org-read-date nil t nil "Select gig date: "))
        (church-id (organ--select-church))
        (fee (read-string "Fee: "))
        (occasion (read-string "Occasion: "))
        (pieces-and-roles (organ--select-pieces-and-roles)))
    (organ--post-request "/gigs/"
     :data (json-encode `(("date" . ,(format-time-string "%Y-%m-%d" date))
                          ("church_id" . ,church-id)
                          ("fee" . ,fee)
                          ("occasion" . ,occasion)
                          ("pieces" . ,pieces-and-roles)))
     :success (cl-function
               (lambda (&key data &allow-other-keys)
                 (message "Gig added successfully: %s" (alist-get 'id data)))))))

(defun organ-gigs ()
  "Fetch and display the list of gigs in a tabulated list mode buffer."
  (interactive)
  (organ--refresh-gigs
   (lambda ()
     (let ((buffer (get-buffer-create "*Organ Gigs*")))
       (with-current-buffer buffer
         (organ-gigs-mode)
         (setq tabulated-list-entries (organ--gigs-list-entries))
         (tabulated-list-print t)
         (display-buffer buffer))))))

(defun organ--gigs-list-entries ()
  "Convert `organ--gigs-cache` to tabulated list entries."
  (mapcar
   (lambda (gig)
     (let ((id (alist-get 'id gig))
           (date (alist-get 'date gig))
           (church (alist-get 'church gig))
           (occasion (alist-get 'occasion gig)))
       (list id (vector date (alist-get 'name church) (or occasion "None")))))
   organ--gigs-cache))

(defun organ-gigs-mode ()
  "Major mode for displaying gigs."
  (kill-all-local-variables)
  (use-local-map tabulated-list-mode-map)
  (setq major-mode 'organ-gigs-mode
        mode-name "Gigs"
        tabulated-list-format [("Date" 15 t)
                               ("Church" 30 t)
                               ("Occasion" 20 t)]
        tabulated-list-padding 2
        tabulated-list-sort-key (cons "Date" nil))
  (tabulated-list-init-header)
  (add-hook 'tabulated-list-revert-hook #'organ-gigs nil t)
  (setq buffer-read-only t))

(defun organ--display-gig-pieces ()
  "Display pieces for the selected gig in a separate buffer."
  (interactive)
  (let* ((id (tabulated-list-get-id))
         (gig (seq-find (lambda (g) (= (alist-get 'id g) id)) organ--gigs-cache))
         (pieces (alist-get 'gig_pieces gig)))
    (let ((buffer (get-buffer-create "*Gig Pieces*")))
      (with-current-buffer buffer
        (read-only-mode -1)
        (erase-buffer)
        (insert (format "Pieces for Gig ID: %d\n\n" id))
        (dolist (gig-piece (append pieces nil))
          (let ((piece (alist-get 'piece gig-piece))
                (role (alist-get 'role gig-piece)))
            (insert (format "Title: %s\nComposer: %s\nRole: %s\nNotes: %s\n\n"
                            (alist-get 'title piece)
                            (alist-get 'composer piece)
                            role
                            (or (alist-get 'notes piece) "None")))))
        (read-only-mode 1)
        (goto-char (point-min))
        (display-buffer buffer)))))

(defun organ--delete-gig ()
  "Delete the selected gig, sending request to the API"
  (interactive)
  (let* ((id (tabulated-list-get-id)))
    (when (y-or-n-p (format "Are you sure you want to delete gig %d? " id))
    (organ--delete-request
     (format "/gigs/%d" id)
     :success (cl-function
               (lambda (&key data &allow-other-keys)
                 (message "Gig %s deleted successfully" id)
                 (organ-gigs)))))))
     

(defun organ--edit-gig ()
  "Edit the selected gig, sending updated data to the API."
  (interactive)
  (let* ((id (tabulated-list-get-id))
         (gig (seq-find (lambda (g) (= (alist-get 'id g) id)) organ--gigs-cache))
         (date (org-read-date nil t (alist-get 'date gig) "Edit gig date: "))
         (church-id (organ--select-church-with-default (alist-get 'church gig)))
         (pieces-and-roles (organ--edit-pieces-and-roles (alist-get 'gig_pieces gig)))
         (fee (read-string "Edit gig fee: " (format "%.2f" (alist-get 'fee gig))))
         (occasion (read-string "Edit occasion: " (or (alist-get 'occasion gig) ""))))
    (organ--put-request (format "/gigs/%d" id)
     :data (json-encode `(("date" . ,(format-time-string "%Y-%m-%d" date))
                          ("church_id" . ,church-id)
                          ("pieces" . ,pieces-and-roles)
                          ("fee" . ,fee)
                          ("occasion" . ,occasion)))
     :success (cl-function
               (lambda (&key data &allow-other-keys)
                 (message "Gig edited successfully: %s" (alist-get 'id data))
                 (organ-gigs))))))

(defun organ--edit-pieces-and-roles (current-pieces)
  "Edit pieces and roles with CURRENT-PIECES as default values."
  (let (selected-pieces)
    (dolist (gig-piece (append current-pieces nil))
      (let* ((piece (alist-get 'piece gig-piece))
             (role (alist-get 'role gig-piece))
             (completion-table (mapcar #'car organ-pieces))
             (default-title (alist-get 'title piece))
             (selected-piece (completing-read "Edit piece: " completion-table nil t nil nil default-title))
             (piece-id (cdr (assoc selected-piece organ-pieces)))
             (selected-role (completing-read "Edit role: " '("Prelude" "Offertory" "Postlude" "Other") nil t nil nil role)))
        (push `(("piece_id" . ,piece-id) ("role" . ,selected-role)) selected-pieces)))
    selected-pieces))

(define-key tabulated-list-mode-map (kbd "RET") 'organ--display-gig-pieces)
(define-key tabulated-list-mode-map (kbd "d") 'organ--delete-gig)
(define-key tabulated-list-mode-map (kbd "e") 'organ--edit-gig)
(define-key tabulated-list-mode-map (kbd "g") 'organ-gigs)

(provide 'organ-gigs)
