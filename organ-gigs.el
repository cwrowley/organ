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
  (let ((roles '("Prelude" "Offertory" "Postlude" "Other")))
    (completing-read "Select role: " roles nil t)))

(defun organ--select-piece-and-role ()
  "Prompt the user to select a single piece and associated role"
  (let ((piece-id (organ--select-piece))
        (role (organ--select-role)))
    ;;(message "in select-piece-and-role piece-id is %s" piece-id)
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

(defun organ-add-gig ()
  "Interactively add a new gig."
  (interactive)
  (let* ((date (org-read-date nil t nil "Select gig date: "))
         (church-id (organ--select-church))
         (fee (read-string "Fee: "))
         (occasion (read-string "Occasion: "))
         (pieces-and-roles (organ--select-pieces-and-roles))
         (payload (json-encode `(("date" . ,(format-time-string "%Y-%m-%d" date))
                                 ("church_id" . ,church-id)
                                 ("fee" . ,fee)
                                 ("occasion" . ,occasion)
                                 ("pieces" . ,(vconcat pieces-and-roles))))))
    ;; (message "Sending payload: %s" payload)
    (organ--post-request
     "/gigs/"
     :data payload
     :success (cl-function
               (lambda (&key data &allow-other-keys)
                 (message "Gig added successfully: %s" (alist-get 'id data))
                 (organ-gigs))))))

(defun organ-gigs ()
  "Fetch and display the list of gigs in a separate buffer."
  (interactive)
  (organ--refresh-gigs
   (lambda ()
     (let ((buffer (get-buffer-create "*Organ Gigs*")))
       (with-current-buffer buffer
         (organ-gigs-mode)
         (setq tabulated-list-entries (organ--gigs-list-entries))
         (tabulated-list-print t)
         (switch-to-buffer buffer))))))

(defun organ--gigs-list-entries ()
  "Convert `organ--gigs-cache` to tabulated list entries."
  (mapcar
   (lambda (gig)
     (let ((id (alist-get 'id gig))
           (date (alist-get 'date gig))
           (church (alist-get 'name (alist-get 'church gig)))
           (occasion (or (alist-get 'occasion gig) ""))
           (fee (format "%3d" (alist-get 'fee gig))))
       (list id (vector date church occasion fee))))
   organ--gigs-cache))

(define-derived-mode organ-gigs-mode
  tabulated-list-mode "Organ gigs"
  "Major mode for displaying organ gigs"
  (setq tabulated-list-format [("Date" 15 t)
                               ("Church" 35 t)
                               ("Occasion" 25 t)
                               ("Fee" 5 t)]
        tabulated-list-padding 2
        tabulated-list-sort-key (cons "Date" nil))
  (add-hook 'tabulated-list-revert-hook #'organ-gigs nil t)
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
  (mapcar
   (lambda (gig-piece)
     (let* ((id (alist-get 'id gig-piece))
           (role (alist-get 'role gig-piece))
           (piece (alist-get 'piece gig-piece))
           (piece-data (organ--piece-data-list piece)))
       (list id (apply 'vector (cons role piece-data)))))
   gig-pieces))

(defun organ--display-gig-pieces (&optional id)
  "Display pieces for the selected gig in a separate buffer."
  (interactive)
  (let ((gig-id (or id (tabulated-list-get-id))))
    (organ--get-request
     (format "/gigs/%d" gig-id)
     :success
     (cl-function
      (lambda (&key data &allow-other-keys)
        (let* ((gig (append data nil))
               (church (alist-get 'name (alist-get 'church gig)))
               (date (alist-get 'date gig))
               (gig-pieces (alist-get 'gig_pieces gig))
               (buf-title (format "*Pieces for %s on %s*" church date))
               (buffer (get-buffer-create buf-title)))
          ;; (message "returned gig for id %d is %s" gig-id gig)
          (with-current-buffer buffer
            (organ-gig-pieces-mode)
            (setq tabulated-list-entries (organ--gig-pieces-entries gig-pieces))
            (setq-local this-gig gig)
            (tabulated-list-print t)
            (display-buffer buffer))))))))

(defun organ--display-gig-pieces-bak (&optional id)
  "Display pieces for the selected gig in a separate buffer."
  (interactive)
  (let* ((gig-id (or id (tabulated-list-get-id)))
         (gig (seq-find (lambda (g) (= (alist-get 'id g) gig-id)) organ--gigs-cache))
         (church (alist-get 'name (alist-get 'church gig)))
         (date (alist-get 'date gig))
         (gig-pieces (alist-get 'gig_pieces gig))
         (buf-title (format "*Pieces for %s on %s*" church date))
         (buffer (get-buffer-create buf-title)))
    (with-current-buffer buffer
      (organ-gig-pieces-mode)
      (setq tabulated-list-entries (organ--gig-pieces-entries gig-pieces))
      (setq-local this-gig gig)
      (tabulated-list-print t)
      (display-buffer buffer))))

(defun organ--add-piece-to-gig ()
  "Add piece to the gig currently displayed in the gig-pieces buffer"
  (interactive)
  (let* ((id (alist-get 'id this-gig))
         (date (alist-get 'date this-gig))
         (church-id (alist-get 'id (alist-get 'church this-gig)))
         (old-pieces (organ--simplify-pieces (alist-get 'gig_pieces this-gig)))
         (pieces-and-roles (cons (organ--select-piece-and-role) old-pieces))
         (fee (alist-get 'fee this-gig))
         (occasion (alist-get 'occasion this-gig))
         (payload (json-encode `(("date" . ,date)
                                 ("church_id" . ,church-id)
                                 ("pieces" . ,(vconcat pieces-and-roles))
                                 ("fee" . ,fee)
                                 ("occasion" . ,occasion)))))
    ;; (message "old-pieces: %S (type: %s)"
    ;;          old-pieces
    ;;          (type-of old-pieces))
    ;; (message "Sending payload: %s" payload)
    (organ--put-request
     (format "/gigs/%d" id)
     :data payload
     :success (cl-function
               (lambda (&key data &allow-other-keys)
                 (message "Piece added to gig")
                 (organ--display-gig-pieces id))))))

(define-key organ-gig-pieces-mode-map (kbd "a") 'organ--add-piece-to-gig)

(defun organ--delete-gig ()
  "Delete the selected gig, sending request to the API"
  (interactive)
  (let* ((id (tabulated-list-get-id)))
    (when (yes-or-no-p (format "Are you sure you want to delete gig %d? " id))
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
                 (message "Gig edited successfully")
                 (organ-gigs))))))

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
(define-key organ-gigs-mode-map (kbd "g") 'organ-gigs)

;; TODO
;; - delete a piece from a gig
;; - edit a gig, populating pieces correctly
;; - probably don't need the gigs cache
(provide 'organ-gigs)
