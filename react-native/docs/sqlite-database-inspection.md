# SQLite Database Inspection

## Problem

When developing with **Expo Go** and **Drizzle ORM**, you cannot use Drizzle Studio to inspect your SQLite database. Expo Go's sandboxed environment and architecture don't support the direct database connection that Drizzle Studio requires.

This document provides a workaround to extract and inspect the database using desktop SQLite viewers.

## Solution

You can extract the SQLite database file from the iOS simulator running Expo Go and open it in a desktop SQLite viewer application.

## Step-by-Step Instructions

### 1. Get Expo Go's Container Path

First, get the container path for the Expo Go app running on your iOS simulator:

```bash
xcrun simctl get_app_container booted host.exp.Exponent data
```

This will output a path like:
```
/Users/<username>/Library/Developer/CoreSimulator/Devices/<device-uuid>/data/Containers/Data/Application/<app-uuid>
```

### 2. Navigate to the Container Directory

```bash
cd "<path-from-step-1>"
```

### 3. Find the Database File

Search for the database file within the container:

```bash
find . -name "antler.db" -type f
```

This will output the relative path to your database file, which should look like:
```
./Documents/ExponentExperienceData/@<your-expo-username>/<app-slug>/SQLite/antler.db
```

**Note**: The database is stored under your Expo account username and app slug (from `app.json`), not in the standard `Application Support` directory.

### 4. Copy the Database File

Copy the database to your Desktop for easy access:

```bash
cp ./Documents/ExponentExperienceData/@<your-expo-username>/<app-slug>/SQLite/antler.db ~/Desktop/
```

### 5. Open in SQLite Viewer

Open the copied database file in your preferred SQLite desktop application.

- **DB Browser for SQLite** - https://sqlitebrowser.org/
  - Cross-platform, feature-rich, actively maintained
  - Best for most use cases