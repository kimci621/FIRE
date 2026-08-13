.PHONY: setup dev test e2e build serve icons

setup:
	cd platform && npm install

dev:
	cd platform && npm run dev

test:
	cd platform && npm run test

e2e:
	cd platform && npm run e2e

build:
	cd platform && npm run build

serve:
	cd platform && npm run preview

icons:
	cd platform && npm run icons
