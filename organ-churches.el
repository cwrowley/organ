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
   (organ--callback data
    (setq organ--churches-cache (mapcar #'organ--format-church data))
    (organ--log "Fetched and cached churches")
    (when callback
      (funcall callback)))))

(defmacro organ--ensure-churches (&rest body)
  "Ensure `organ--churches-cache` is populated.
If not, call `organ--refresh-churches` and then execute forms in BODY."
  `(let ((callback (lambda () ,@body)))
     (if organ--churches-cache
         (funcall callback)
       (progn
         (organ--log "Fetching churches...")
         (organ--refresh-churches callback)))))

(defun organ--select-church (&optional default-church)
  "Prompt the user to select a church from the cached list and return its ID.
If DEFAULT-CHURCH is provided, use it as the default value.
Fetch churches if the cache is empty.

Note: should be called inside `organ--ensure-churches`"
  (interactive "P")
  (let* ((completion-table (mapcar #'car organ--churches-cache))
         (default-name (when default-church (alist-get 'name default-church)))
         (selected-church (completing-read "Select a church: " completion-table nil t nil nil default-name))
         (selected-id (cdr (assoc selected-church organ--churches-cache))))
    (organ--log "Selected church ID: %s" selected-id)
    selected-id))

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
    (organ--log "POST request with payload: %s" payload)
    (organ--post-request "/churches/"
     :data payload
     :success
     (organ--callback data
      (message "Church added successfully: %s" (alist-get 'id data))
      (organ--refresh-churches)))))

;; TODO: list churches, edit church

(provide 'organ-churches)
