# Tutorial screenshots

Scripted, so they can be taken again when the editor changes.

`food-label.mjs` shoots every image of the food label tutorial from a local
editor, on the example design (*Food label (tutorial)*, in the demo account's
Test designs folder).

1. Run the pfx dev server and copy `public/embed-harness.html` to
   `public/_tut-harness.html` with the admin switch and the save blocker (see
   the script's header). Delete the copy afterwards.
2. `npm i playwright-core@1.38.1` somewhere, with Chromium in `%LOCALAPPDATA%/ms-playwright`.
3. `PORT=3011 OUT=<docs>/images/tutorials/food-label/ node food-label.mjs all`

Nothing is saved: the harness drops every save, because the demo store has a
live Zapier hook.

`bakery-label.mjs` does the same for the bakery label tutorial (*Bakery box label
(tutorial)*, same folder): `PORT=3011 OUT=<docs>/images/tutorials/bakery-label/ node bakery-label.mjs all`.
