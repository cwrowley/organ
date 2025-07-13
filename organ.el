(require 'organ-api)
(require 'organ-pieces)
(require 'organ-churches)
(require 'organ-gigs)

(defvar organ-map
  (let ((map (make-sparse-keymap)))
    (define-key map (kbd "g") 'organ-gigs)
    (define-key map (kbd "p") 'organ-pieces)
    (define-key map (kbd "a") 'organ-add-gig)
    map)
  "Keymap for organ commands")

(global-set-key (kbd "C-c o") organ-map)

(provide 'organ)
