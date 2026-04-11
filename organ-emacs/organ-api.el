;; -*- lexical-binding: t; -*-

(require 'cl-lib)
(require 'request)

;;;; API calls

(defgroup organ nil
  "Customization group for my Emacs package."
  :group 'applications)

(defcustom organ-base-url "http://localhost:1685"
  "Base URL for the API requests in organ package."
  :type 'string
  :group 'organ)

(defcustom organ-api-key ""
  "API key for authenticating with the organ backend.
Set this in your init file: (setq organ-api-key \"your-key-here\")"
  :type 'string
  :group 'organ)

(defun organ--auth-headers ()
  "Return an alist of auth headers, or signal an error if key is unset."
  (when (string-empty-p organ-api-key)
    (error "organ-api-key is not set.  Add (setq organ-api-key \"...\") to your init file"))
  (list (cons "Authorization" (concat "Bearer " organ-api-key))))

(defmacro organ--callback (arg &rest body)
  `(cl-function
    (lambda (&key data &allow-other-keys)
      (let ((,arg data))
        ,@body))))

(defun organ--api-request (endpoint &rest args)
  "Make an API request to ENDPOINT with ARGS.
ARGS can include :type, :headers, :data, :success, and :error."
  (let ((type (plist-get args :type))
        (headers (plist-get args :headers))
        (data (plist-get args :data))
        (success (plist-get args :success))
        (error (or (plist-get args :error)
                   (cl-function (lambda (&key error-thrown &allow-other-keys)
                                  (message "Error: %s" error-thrown))))))
    (request
     (concat organ-base-url endpoint)
     :type type
     :headers headers
     :data data
     :parser 'json-read
     :success success
     :error error)))

(defun organ--get-request (endpoint &rest args)
  "Make a GET request to ENDPOINT with ARGS."
  (apply 'organ--api-request endpoint
         :type "GET"
         :headers (append '(("Accept" . "application/json")) (organ--auth-headers))
         args))

(defun organ--post-request (endpoint &rest args)
  "Make a POST request to ENDPOINT with ARGS."
  (apply 'organ--api-request endpoint
         :type "POST"
         :headers (append '(("Content-Type" . "application/json")) (organ--auth-headers))
         args))

(defun organ--put-request (endpoint &rest args)
  "Make a PUT request to ENDPOINT with ARGS."
  (apply 'organ--api-request endpoint
         :type "PUT"
         :headers (append '(("Content-Type" . "application/json")) (organ--auth-headers))
         args))

(defun organ--delete-request (endpoint &rest args)
  "Make a DELETE request to ENDPOINT with ARGS."
  (apply 'organ--api-request endpoint
         :type "DELETE"
         :headers (append '(("Accept" . "application/json")) (organ--auth-headers))
         args))

(provide 'organ-api)
