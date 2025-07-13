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
         :headers '(("Accept" . "application/json"))
         args))

(defun organ--post-request (endpoint &rest args)
  "Make a POST request to ENDPOINT with ARGS."
  (apply 'organ--api-request endpoint
         :type "POST"
         :headers '(("Content-Type" . "application/json"))
         args))

(defun organ--put-request (endpoint &rest args)
  "Make a PUT request to ENDPOINT with ARGS."
  (apply 'organ--api-request endpoint
         :type "PUT"
         :headers '(("Content-Type" . "application/json"))
         args))

(defun organ--delete-request (endpoint &rest args)
  "Make a DELETE request to ENDPOINT with ARGS."
  (apply 'organ--api-request endpoint
         :type "DELETE"
         :headers '(("Accept" . "application/json"))
         args))

(provide 'organ-api)
