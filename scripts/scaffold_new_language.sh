#!/bin/bash

# Check if language code is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <language_code>"
  echo "Example: $0 de"
  exit 1
fi

LANG_CODE=$1
PROJECT_ROOT=$(pwd)

echo "Scaffolding new language: $LANG_CODE"

# 1. Create translation directory and copy English template
mkdir -p src/locales/$LANG_CODE
cp src/locales/en/translation.json src/locales/$LANG_CODE/translation.json
echo "Created src/locales/$LANG_CODE/translation.json (copied from en)"

# 2. Create audio directories
mkdir -p src/assets/sounds/$LANG_CODE
mkdir -p public/assets/nback-sounds/$LANG_CODE

# 3. Add READMEs
echo "Place translated MATB audio files here. Filenames must match English versions exactly." > src/assets/sounds/$LANG_CODE/README.txt
echo "Place translated N-Back audio files here (e.g., C.wav). Fallback is English." > public/assets/nback-sounds/$LANG_CODE/README.txt

echo "Created audio directories:"
echo "- src/assets/sounds/$LANG_CODE"
echo "- public/assets/nback-sounds/$LANG_CODE"

# 4. Instructions
echo ""
echo "--------------------------------------------------------"
echo "✅ Scaffolding complete for '$LANG_CODE'."
echo "--------------------------------------------------------"
echo "NEXT STEPS:"
echo "1. Edit 'src/i18n.js':"
echo "   - Import the new JSON: import translation${LANG_CODE^^} from './locales/$LANG_CODE/translation.json';"
echo "   - Add it to resources: $LANG_CODE: { translation: translation${LANG_CODE^^} }"
echo ""
echo "2. Edit 'src/components/LanguageSelector.jsx':"
echo "   - Add a flag/button for '$LANG_CODE' in the 'flags' object and the render method."
echo ""
echo "3. Translate 'src/locales/$LANG_CODE/translation.json'."
echo ""
echo "4. (Optional) Add audio files to the new audio directories."
echo "--------------------------------------------------------"
