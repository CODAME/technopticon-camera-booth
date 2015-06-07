#!/bin/sh

if [ "$1" == "" ]; then
  echo 'Usage: start_kiosk [ALBUM_ID]'
  exit 1
fi
ALBUM_ID="$1"

APP_SERVER='localhost:8888'
APP_URL=http://$APP_SERVER/technopticon-camera-booth/?album=$ALBUM_ID

# Go!
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome $APP_URL --use-fake-ui-for-media-stream
