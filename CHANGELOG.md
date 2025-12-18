# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [1.2.2] - 2025-12-18
### Added
- **Multi-language Audio**: Integrated new Greek (el) and Swedish (sv) audio files.
  - Communications task now automatically selects audio from the folder matching the current UI language.
  - Implemented language-aware filtering for both automated events and manual triggers.
  - Added fallback logic to English if the selected language is missing specific files.
- **Rebranding**: Changed own callsign from `NASA504` to `ESA504` across UI, instructions, and simulation logic.


## [1.2.1] - 2025-12-16
### Fixed
- **Communications Task Scoring**: Fixed issue where correct inputs resulted in no score or prolonged delay.
  - Implemented immediate "HIT" detection upon dialing correct frequency for OWN calls.
  - Fixed valid response window timeouts (was wrongly calculating 2.7 hours, effectively disabling "MISS" penalties). 
- **System Health**: 
  - Fixed wiring for discrete health penalties in Communications and Monitoring tasks.
  - Verified negative health impact for Misses (-5) and False Alarms (-10) in Communications task.
- **Training Mode**:
  - Fixed event generation in training presets.
  - Fixed issue where partial task sets would fail to register events.
  - Fixed "I Understand" button interactions.

## [1.2.0] - 2024-XX-XX
### Changed
- `f43888b`: further minor fixes
- `a0b0d2e`: minor fix on event scheduler interval
- `82bb0ad`: fix option to exit for mobile
- `1b72638`: changes to package json
- `b1493b8`: fixeds high score issues for nback
- `3b39297`: incorporated nback and direct links to all segments
- `3b36097`: Reaction time with url integrated
- `cf52929`: Multi URL Functionality
- `c6268f9`: (origin/merge-localization) Saving all current work
- `caa7adf`: (origin/localization-attempt) localization first steps

> Note: Detailed commit history can be viewed with `git log`.
