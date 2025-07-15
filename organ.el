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
 "Organ commands"
 ["Commands"
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
