all: lotka_volterra_eq_2d.png lotka_volterra_eq_3.png

clean:
	rm -f lotka_volterra_eq_2d.png lotka_volterra_eq_3.png

lotka_volterra_eq_2d.png: lotka_volterra_eq_2d.tex
	latex2png -d 100 -g lotka_volterra_eq_2d.tex

lotka_volterra_eq_3.png: lotka_volterra_eq_3.tex
	latex2png -d 120 -g lotka_volterra_eq_3.tex
