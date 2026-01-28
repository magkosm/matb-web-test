# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-01-28
### Added
- **Official Release**: Formally released the OrbAch Web Assessment Suite.
- **Tracking Performance Visualization**: Added RMS Error time-plot to MATB results for detailed performance analysis.
- **Multilingual Support**: Fully integrated English, Greek, and Swedish languages across all tests and audio assets.
- **Automatic Scoring**: Standardized scoring and accuracy calculations for RT, N-Back, and MATB tasks.
- **Data Export**: Comprehensive CSV export functionality for all test results and performance logs.

### Fixed
- **Logging Integrity**: Fixed a critical bug in Tracking task where high-frequency logs were being overwritten.
- **Master Aggregate Export**: Corrected field mappings in suite-wide CSV exports for consistent metric reporting.
- **Performance Optimization**: Removed unnecessary debug logging and improved sensor data sampling for smoother rendering.
- **Suite Flow**: Standardized the transition between Easy and Hard MATB scenarios with appropriate resets.
