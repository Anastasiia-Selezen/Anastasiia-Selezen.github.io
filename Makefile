NPM ?= npm

.PHONY: help install dev build preview

help:
	@echo 'Website commands'
	@echo '  make install       install Astro dependencies'
	@echo '  make dev           run Astro dev server'
	@echo '  make build         build production site'
	@echo '  make preview       preview production build'

install:
	$(NPM) install

dev:
	$(NPM) run dev

build:
	$(NPM) run build

preview:
	$(NPM) run preview
