# Five-Star Deathmatch

A Flask web application for ranking and flagging images in a
directory. This tool provides a simple lightweight interface to view,
rank, and flag images using keyboard shortcuts.

**Note**: this project was written by GenAI based on a detailed
specification document. A dozen local coding LLMs did a terrible job
of it, and it took ChatGPT 18 passes to get the code into decent
shape. Windsurf implemented it correctly on the first pass, fixed four
minor bugs on the second pass, and packaged it up with Poetry on the
third and final pass. Don't expect more complicated projects to be
*that* successful. :grin:

## Why 'deathmatch'?

"81 images enter, 1 image leaves"

Sorting through a large collection of pictures is hard, and most
photo-management software does a poor job of it. Stars, hearts, flags,
colors, tags, keywords, blah-blah-blah. The solution I've settled on
is "stars are for quality, flags are for interest". Any picture can be
interesting for some reason, but when you take a lot of pictures on
vacation (or run a genai image-generator for a few hours) and want to
show off your *best*, you need a way to choose them.

My solution is to make them fight for it.

Let's say that between my smartphone and my camera I took 850 pictures
on a recent vacation. Some of them are just crap that should be
deleted because they're out of focus, poorly framed, overexposed, etc.
Those are easy to get rid of, but if 40 are crap, I still have 810 to
go through.

I rank two-thirds of them (540) as 1-star, and *no more than
one-third* (270) as 2-star. Then I promote one-third (90) of the
2-star images to 3-star. Then one-third (30) to 4-star, and finally
one-third (10) to 5-star. This can be painful until you get used to
it.

Along the way, I'm sure to stumble across images that are interesting
for reasons other than quality. Maybe it's the only picture I took at
a certain location, maybe I want to send a copy to the person who's in
it, etc; those images get flagged.

One flag might not be enough, so this app supports six of them, A-F,
with no pre-defined meaning.

## Usage

Run the script with a single argument, the name of a directory full of
PNG and/or JPG images (defaults to the current directory):

```
poetry run deathmatch /Volume/pics/fresh
# or
deathmatch /Volume/pics/fresh
```

Now open a browser window to http://127.0.0.1:5000, You should see a
status bar at top, the first image in the directory by modification
time, a help button in the upper right, and two rows of buttons at the
bottom.

The first row of buttons are rank. All images start at 0, and can
either be promoted by pressing 1-5 or rejected by pressing X. This
will update the matching buttons at the bottom and advance to the next
image.

The second row of buttons are flags. One or more can be selected by
pressing A-F; this will not advance to the next image, so you can flag
a picture before ranking it. Flags mean whatever you want them to, and
are there so you can easily mark images that are interesting for
reasons other than quality ("family", "funny", "disturbingly similar
to that girl from Frozen", etc). The far-right button matches images
that do not have any flags set.

Clicking on any of the buttons excludes matching images from the display.

## Running a deathmatch

1. Run the program on a directory full of images and click each of the
   following buttons: X, 1, 2, 3, 4, and 5, filtering the list to show
   only rank 0 images (all of them at first).

2. Starting with the first image, press either X or 1; it will rank
   the current picture and advance to the next one. Make this a very
   quick pass that just takes out the trash. Out of focus, picture of
   lens cap, shakycam, AI gal with three arms and twelve fingers, etc.
   When you're done, you'll have no images left at rank 0.

3. Click the 0 and 1 buttons, so that only rank 1 images are displayed.
   Make a pass across all rank 1 images, promoting exactly one-third to
   2. The easiest way to do this is just have your fingers on the 1 and 2
   keys rather than using right-arrow to skip the 1's. Be brutal; you're
   picking your best. If a picture is *interesting* for reasons other
   than quality, flag it with A-F.

4. (Optional: walk away for an hour or a day, and come back fresh) Adjust
   your filters and make a pass across all rank 2 images, promoting
   exactly one-third to 3.

5. Rinse and repeat two more times, until 1/81 (1.2%) of your original
   rank 1 images are ranked 5.

6. Export a list of the current unfiltered filenames for importing or
   printing.

## TODO

- helper scripts to process `_rank.txt` for importing rankings to other
  software.

## Bugs

Report any issues you encounter.

## Install (Poetry)

- Ensure Poetry is installed: https://python-poetry.org/docs/#installation
- From this project directory:

```
poetry install
poetry run deathmatch [image_directory]
```

## Install for general use

```
poetry build
cd dist
pip3 install deathmatch-1.0.0-py3-none-any.whl
```

## Package Structure

- src/deathmatch/app.py — main application and CLI entry point
- src/deathmatch/templates/index.html — HTML template
- src/deathmatch/static/app.js — front-end script
