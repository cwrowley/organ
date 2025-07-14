(require 'organ-api)
(require 'organ-pieces)
(require 'organ-churches)
(require 'organ-gigs)
(require 'transient)

(transient-define-prefix organ-transient ()
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

(global-set-key (kbd "C-c o") 'organ-transient)

(provide 'organ)
