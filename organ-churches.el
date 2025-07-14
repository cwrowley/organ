;; -*- lexical-binding: t; -*-

;;;; Churches

(require 'cl-lib)
(require 'organ-api)

(defvar organ--churches-cache nil
  "Cache for storing the list of churches fetched from the API.")

(defun organ--format-church (church)
  (let ((name (alist-get 'name church))
        (id (alist-get 'id church)))
    (cons name id)))

(defun organ--refresh-churches (&optional callback)
  "Fetch the list of churches from the API, store it in `organ--churches-cache`, and execute CALLBACK if provided."
  (organ--get-request "/churches/"
   :success
   (cl-function
    (lambda (&key data &allow-other-keys)
      (setq organ--churches-cache (mapcar #'organ--format-church data))
      (message "Fetched and cached churches")
      (when callback
        (funcall callback))))))

(defun organ--select-church ()
  "Prompt the user to select a church from the cached list and return its ID.
Fetch churches if the cache is empty."
  (interactive)
  (if organ--churches-cache
      (let* ((completion-table (mapcar #'car organ--churches-cache))
             (selected-church (completing-read "Select a church: " completion-table nil t)))
        (message "Selected church ID: %s" (cdr (assoc selected-church organ--churches-cache)))
        (cdr (assoc selected-church organ--churches-cache)))
    (progn
      (message "Cache is empty, fetching churches...")
      (organ--refresh-churches #'organ--select-church))))

(defun organ--select-church-with-default (default-church)
  "Select a church, with DEFAULT-CHURCH as the default value."
  (let* ((completion-table (mapcar #'car organ--churches-cache))
         (default-name (alist-get 'name default-church))
         (selected-church (completing-read "Select a church: " completion-table nil t nil nil default-name)))
    (cdr (assoc selected-church organ--churches-cache))))


(defun organ-add-church ()
  "Interactively add a new church, using an API request"
  (interactive)
  (let* ((name (read-string "Enter church name: "))
        (location (read-string "Enter location: "))
        (info (read-string "Enter info: "))
        (payload
         (json-encode `((name . ,name)
                        (location . ,location)
                        (info . ,info)))))
    (message "POST request with payload: %s" payload)
    (organ--post-request
     "/churches/"
     :data payload
     :success (cl-function
               (lambda (&key data &allow-other-keys)
                 (message "Church added successfully: %s" (alist-get 'id data)))))
    (organ--refresh-churches)))

;; TODO: list churches, edit church

(provide 'organ-churches)
