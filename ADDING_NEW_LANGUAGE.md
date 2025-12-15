# Adding a New Language

This guide explains how to add a new language (e.g., German `de`) to the MATB-II application.

## 1. Automated Scaffolding
We have provided a script to set up the necessary folders and files.

Run the script from the project root:
```bash
./scripts/scaffold_new_language.sh de
```
*(Replace `de` with your desired language code)*

This script will:
- Create `src/locales/de/translation.json` (copied from English).
- Create `src/assets/sounds/de/` for MATB audio.
- Create `public/assets/nback-sounds/de/` for N-Back audio.

## 2. Register the Language
After running the script, you must register the language in the React application.

### A. Edit `src/i18n.js`
1. Import the new translation file:
   ```javascript
   import translationDE from './locales/de/translation.json';
   ```
2. Add it to the `resources` object:
   ```javascript
   const resources = {
     en: { translation: translationEN },
     // ... other languages
     de: { translation: translationDE } // Add this line
   };
   ```

### B. Edit `src/components/LanguageSelector.jsx`
1. Add a flag/icon to the `flags` object. You can use an SVG or CSS-based flag.
   ```javascript
   const flags = {
     // ... other flags
     de: (
       <div style={flagStyle}>
          {/* Your flag implementation here */}
          <div style={{ backgroundColor: 'black', height: '33%' }} />
          <div style={{ backgroundColor: 'red', height: '33%' }} />
          <div style={{ backgroundColor: 'gold', height: '33%' }} />
       </div>
     )
   };
   ```
2. Add a button to the returned JSX:
   ```javascript
   <button onClick={() => changeLanguage('de')} style={...}>
     {flags.de}
     DE
   </button>
   ```

## 3. Translate Content
Open `src/locales/de/translation.json` and translate the values. **Do not change the keys.**

## 4. Localized Audio
The application supports localized audio for Communications Task and N-Back Test.

### Communications Task (MATB)
- Place `.wav` or `.mp3` files in `src/assets/sounds/de/`.
- Filenames **MUST** match the English filenames exactly for the code to recognize them.
- If a file is missing, the English version will be played as a fallback.

### N-Back Test
- Place audio files (e.g., `C.wav`, `H.wav`) in `public/assets/nback-sounds/de/`.
- If a file is missing, the English version will be played as a fallback.
