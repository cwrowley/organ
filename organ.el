;; -*- lexical-binding: t; -*-
;; Author: Clancy Rowley <clancyr@gmail.com>
;; Version: 1.0
;; Package-Requires: ((emacs "24.3") (tablist "1.0") (request "0.3.0") (transient "0.3.0"))
;; Keywords: music
;; URL: https://github.com/cwrowley/organ-emacs

(require 'organ-api)
(require 'organ-pieces)
(require 'organ-churches)
(require 'organ-gigs)
(require 'transient)

(defvar organ-debug-mode nil
  "If non-nil, enable debug message during execution.")

(defun organ--log (message &rest args)
  "Log MESSAGE if `oegan-debug-mode` is enabled."
  (when organ-debug-mode
    (apply 'message message args)))

(transient-define-prefix organ-menu ()
 "Commands for organ gigs"
 ["Organ gigs commands"
  ["Gigs"
   ("g" "View Gigs" organ-gigs)
   ("G" "Add Gig" organ-add-gig)]
  ["Pieces"
   ("p" "View Pieces" organ-pieces)
   ("P" "Add Piece" organ-add-piece)]
  ["Churches"
   ("C" "Add Church" organ-add-church)]])

(global-set-key (kbd "C-c o") 'organ-menu)

(provide 'organ)
