all: lotka_volterra_eq_2d.png lotka_volterra_eq_3.png

clean:
	rm -f lotka_volterra_eq_2d.png lotka_volterra_eq_3.png

lotka_volterra_eq_2d.png: lotka_volterra_eq_2d.tex
	latex2png -g lotka_volterra_eq_2d.tex
	convert lotka_volterra_eq_2d.png -resize 40% lotka_volterra_eq_2d.tmp.png
	mv lotka_volterra_eq_2d.tmp.png lotka_volterra_eq_2d.png

lotka_volterra_eq_3.png: lotka_volterra_eq_3.tex
	latex2png -g lotka_volterra_eq_3.tex
	convert lotka_volterra_eq_3.png -resize 40% lotka_volterra_eq_3.tmp.png
	mv lotka_volterra_eq_3.tmp.png lotka_volterra_eq_3.png
