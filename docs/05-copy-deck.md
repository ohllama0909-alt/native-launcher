# Noctra Client — Copy Deck

Every string visible in `/design`, verbatim, grouped by namespace and ready for
i18n. `{}` = interpolation. Use these exact strings so the build matches the
mockups.

```json
{
  "app": {
    "name": "Noctra Client",
    "build": "Build {version}",
    "onlineCount": "{count} Online",
    "offline": "Offline"
  },

  "about": {
    "label": "ABOUT",
    "line1": "Noctra Client is a personal UI/UX concept of a custom Minecraft launcher.",
    "line2": "Drawing inspiration from Lunar, Feather, and other 3rd party launchers, this project is simply my take on how a modern, user-friendly Minecraft client could look."
  },

  "login": {
    "label": "LOGIN PAGE",
    "blurb": "A clean and secure gateway to your game. The login screen features seamless Microsoft authentication and quick access to the project's GitHub repository.",
    "microsoftPrefix": "Log in with",
    "microsoft": "Microsoft",
    "viewCode": "View code",
    "github": "GitHub",
    "privacy": "Privacy Policy",
    "terms": "Terms of Service",
    "support": "Support",
    "waiting": "Waiting for Microsoft...",
    "tryAgain": "Try again",
    "continueOffline": "Continue offline"
  },

  "home": {
    "blurb": "The home page is designed to be clean, familiar, and easy to navigate. By splitting the interface into three clear sections - a main menu on the left, core game actions in the center, and a friends list on the right - everything you need is instantly accessible without feeling cluttered.",
    "greeting": "Good to see you, {username}",
    "lastPlayed": "Last played:",
    "lastPlayedValue": "{server} - {relativeTime}",
    "totalPlaytime": "Total playtime:",
    "totalPlaytimeValue": "{hours}h",
    "launch": "LAUNCH",
    "changeVersion": "CHANGE VERSION",
    "sections": {
      "latestProfiles": "LATEST PROFILES",
      "partners": "PARTNERS",
      "newsFeed": "NEWS FEED",
      "partnerProgram": "PARTNER PROGRAM",
      "newMods": "NEW MODS!"
    },
    "changelog": {
      "title": "CHANGELOG",
      "bullet1": "Performance optimizations",
      "bullet2": "General bug fixes & stability",
      "readMore": "READ MORE"
    },
    "promo": {
      "badge": "NEW VERSION!",
      "title": "New Minecraft version!",
      "version": "26.1",
      "footer": "Ready in Noctra"
    },
    "becomeCreator": "BECOME A CREATOR",
    "newModNames": ["ADVANCED KEYBINDS", "COMBAT HUD", "WEATHER CHANGER"]
  },

  "launchState": {
    "downloadingBlurb": "The downloading state updates the main button and adds a progress bar beneath it. This gives clear information about the files being downloaded and the remaining size.",
    "downloading": "DOWNLOADING",
    "fetchingFile": "Fetching {filename}...",
    "progress": "{done} / {total}",
    "preparing": "PREPARING",
    "verifying": "Verifying assets...",
    "running": "RUNNING",
    "kill": "Kill",
    "relaunch": "RELAUNCH",
    "exited": "Exited with code {code}"
  },

  "offline": {
    "blurb": "If the connection drops, the launcher shows an offline notification banner and disables the primary launch button until the network is restored.",
    "banner": "Noctra is running in offline mode. No connection available.",
    "solutions": "Potential Solutions",
    "noConnection": "No connection available",
    "friendsServiceDown": "Unable to connect to Noctra Friends Service."
  },

  "friends": {
    "label": "FRIENDS MENU",
    "blurb": "Keep your community close. Toggle effortlessly between your active friends list and incoming requests.",
    "tabFriends": "Friends",
    "tabRequests": "Requests",
    "searchPlaceholder": "Find a player...",
    "online": "{count} Online",
    "offlineCount": "{count} Offline",
    "received": "{count} Received",
    "sent": "{count} Sent",
    "receivedAt": "Received {when}",
    "sentAt": "Sent {when}",
    "status": {
      "inGame": "In-game: {server}",
      "singleplayer": "In-game: Singleplayer",
      "privateServer": "In-game: Private Server",
      "inLauncher": "In Launcher",
      "inMenus": "In Menus",
      "idle": "Idle",
      "offlineFor": "Offline for {duration}"
    },
    "overlay": {
      "title": "Active Chat Overlay",
      "openRelay": "Open Relay",
      "composer": "Type Message to {username}..."
    },
    "contextMenu": {
      "heading": "Contextual Actions (Right-click)",
      "joinServer": "Join Server",
      "sendMessage": "Send Message",
      "addToGroup": "Add to Group",
      "addBestFriend": "Add Best Friend",
      "setNickname": "Set Nickname",
      "copyIgn": "Copy IGN",
      "unfriend": "Unfriend",
      "block": "Block"
    }
  },

  "relay": {
    "label": "RELAY",
    "blurb": "For deeper conversations, the Fast-Chat seamlessly expands into Noctra Relay. It's a dedicated, full-screen communication hub where you can manage direct messages, organize group chats, and share media without needing third-party software.",
    "title": "Noctra Relay",
    "searchInbox": "Search inbox...",
    "searchConversation": "Search in conversation...",
    "pinned": "Pinned",
    "groups": "Groups",
    "directMessages": "Direct Messages",
    "selfPrefix": "You: ",
    "typing": "{username} is typing...",
    "composer": "Type Message to {username}..."
  },

  "versions": {
    "label": "CHANGE VERSION",
    "blurb": "A frictionless version switcher. Easily navigate through different Minecraft releases and manage your specific profiles with just a few clicks.",
    "launch": "LAUNCH",
    "versionLabel": "VERSION"
  },

  "profilePanel": {
    "fetchingBlurb": "Smooth transitions and clear visual feedback while the profile configuration is being processed.",
    "nav": {
      "loader": "Loader",
      "mods": "Mods",
      "shaders": "Shaders",
      "worlds": "Worlds",
      "resources": "Resources",
      "advanced": "Advanced"
    },
    "mods": {
      "search": "Find a mod...",
      "loaded": "{count} mods loaded",
      "dropTitle": "3rd Party Mods",
      "dropSubtitle": "Drag & drop files here, or browse to add mods.",
      "author": "By {author}",
      "meta": "v{version} • {size}",
      "enabled": "Enabled"
    },
    "worlds": {
      "search": "Find a world...",
      "fetching": "Fetching worlds...",
      "dropTitle": "Worlds",
      "dropSubtitle": "Drag & drop files here, or browse to add worlds."
    },
    "advanced": {
      "blurb": "Deep, granular control over allocated RAM, game resolution, and custom JVM arguments.",
      "search": "Search settings...",
      "title": "Advanced Settings",
      "warning": "Proceed with caution. Modifying these settings may cause game instability.",
      "resolutionTitle": "Game Resolution",
      "resolutionDesc": "Define custom launch resolution and fullscreen preferences.",
      "presets": ["1080p", "1440p", "4K"],
      "fullscreen": "Fullscreen mode",
      "borderless": "Borderless Window",
      "lockAspect": "Lock Aspect Ratio",
      "memoryTitle": "Allocated Memory",
      "memoryDesc": "Overrides global RAM settings for this specific profile.",
      "memoryValue": "{used} GB / {total} GB",
      "jvmTitle": "JVM Arguments",
      "jvmDesc": "Custom Java execution flags for advanced performance tweaking."
    }
  },

  "cloud": {
    "syncedMods": "All mods synced to Noctra Cloud",
    "syncedSettings": "All settings synced to Noctra Cloud",
    "syncedMedia": "All media synced to Noctra Cloud",
    "syncedCosmetics": "All cosmetics synced to Noctra Cloud",
    "syncing": "Syncing with Noctra Cloud...",
    "lastSynced": "Last synced: {when}",
    "lastSyncedNever": "Last synced: -",
    "usage": "{used} / {total} used"
  },

  "locker": {
    "label": "LOCKER",
    "blurb": "Your personal wardrobe, built right in. The Locker allows you to instantly swap, preview, and manage your Minecraft skins without ever opening a browser. Mark your go-to outfits as favorites for quick access before joining a server.",
    "currentSkin": "CURRENT SKIN",
    "uploadSkin": "UPLOAD SKIN",
    "uploadHint": "Drag & drop file or browse",
    "capes": "CAPES",
    "favorites": "FAVORITES",
    "latest": "LATEST",
    "import": {
      "blurb": "Seamless skin importing. Instantly preview your uploaded file, adjust the specific player model type, and assign a custom name - all within one streamlined popup.",
      "name": "Name",
      "defaultName": "unnamed-{n}",
      "file": "File",
      "playerModel": "Player Model",
      "wide": "Wide",
      "slim": "Slim",
      "save": "Save"
    }
  },

  "gallery": {
    "label": "GALLERY",
    "blurb": "A smarter way to organize your screenshots. Find exactly what you're looking for with advanced Smart Filters that let you sort media by date, specific servers, or even players who were nearby.",
    "search": "Search in gallery...",
    "view": "View",
    "viewGrid": "Grid",
    "viewList": "List",
    "viewDetailed": "Detailed",
    "sorting": "Sorting",
    "sortNewest": "Newest",
    "sortOldest": "Oldest",
    "sortSize": "Size",
    "smartFilters": "Smart Filters",
    "filterByPlayer": "Filter by player",
    "filterByServer": "Filter by server",
    "filterByDate": "Filter by date",
    "lastWeek": "Last Week",
    "lastMonth": "Last Month",
    "weekdays": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    "empty": {
      "blurb": "The empty state actively encourages users to take screenshots and provides an immediate solution for fixing incorrect directory paths.",
      "title": "Your Gallery is empty.",
      "hint": "Press F2 in-game to capture your first memory!",
      "mistake": "Think this is a mistake?",
      "changePath": "Change default folder path"
    }
  },

  "settings": {
    "blurb": "The general settings panel acts as the control center for the entire launcher. The Storage tab showcased here provides a clear, visual breakdown of your synced data, making it easy to manage your files.",
    "cloudTitle": "NoctraCloud",
    "plan": "STANDARD",
    "upgrade": "Upgrade",
    "storage": "Storage",
    "seeDetailedStats": "See Detailed Stats",
    "segments": {
      "captures": "Captures ({size})",
      "assets": "Assets ({size})",
      "locker": "Locker ({size})",
      "configs": "Configs ({size})",
      "other": "Other ({size})",
      "free": "Free ({size})"
    },
    "syncPreferences": "Sync Preferences",
    "autoSyncCaptures": "Auto-Sync Captures",
    "syncResources": "Sync Resources",
    "backupConfigurations": "Backup Configurations",
    "uploadWhenClosed": "Upload only when game is closed"
  },

  "crash": {
    "blurb": "When a game crash occurs, the launcher is designed to reduce user frustration. It automatically identifies the potential cause of the issue and provides quick action buttons to copy or open the crash logs for easier troubleshooting.",
    "title": "Game Crash Detected",
    "description": "The internal server encountered a fatal error while updating a block entity. (Exit Code: {code})",
    "suspectedCause": "Suspected Cause",
    "exitCode": "Exit Code: {code}",
    "relaunch": "Relaunch Game",
    "copyLog": "Copy Crash Log",
    "openLog": "Open Crash Log",
    "supportHint": "If this issue persists, please reach out to Support."
  },

  "styleGuide": {
    "label": "STYLE GUIDE",
    "paletteTitle": "MAIN COLOR PALETTE",
    "text": "TEXT",
    "primary": "PRIMARY",
    "background": "BACKGROUND",
    "lightGray": "LIGHT GRAY",
    "purpleFreedom": "PURPLE FREEDOM",
    "beyondBlack": "BEYOND BLACK",
    "paletteBlurb": "The Noctra palette relies on a carefully balanced dark mode to reduce eye strain. Deep backgrounds provide a solid foundation, allowing the crisp typography to stand out, while the primary purple adds a distinct, modern gaming character.",
    "typographyTitle": "TYPOGRAPHY",
    "typeface": "FIGTREE",
    "classification": "Classification: Geometric Sans-Serif",
    "weights": ["Black", "Bold", "Medium", "Light"]
  },

  "meta": {
    "project": "PROJECT: Noctra Client",
    "role": "ROLE: UI/UX Design",
    "platform": "PLATFORM: Desktop Application",
    "credit": "Concept by dbrn",
    "year": "2026"
  }
}
```

## Sample data used in the mockups (useful for seeding dev fixtures)

**User:** `dbrn` · playtime `1,364h` / `1,662h` · last played `Hypixel` (16 h ago) / `Donut SMP` (7 h ago)

**Friends (online):** `172px` (In-game: Hypixel), `daaaavidds` (Singleplayer),
`masaya46` (Private Server), `3wafyy`, `cuvsa` (Donut SMP), `zakhbear` (In Menus),
`KingofHalo04` (Idle), `meegreyone` (Idle)

**Friends (offline):** `XerxerBro` (3 days), `2fishbowl` (21 hours),
`wtfbroimlagging` (36 days), `Director32` (20 days)

**Requests received:** `Caelindra`, `lderzz`, `29x29`, `yquedoasi`, `janekov`,
`cellexa`, `Cholsit0` — **sent:** `dortsi`, `Kamyko34`, `Gabe2z`, `Aukku0`, `CallMeLegal`

**Profiles:** `Hypixel Bedwars` (Forge 1.8.9), `WorldEdit` (Fabric 1.21.11)

**Downloads:** `fabric-loader-0.15.7.jar`, `78.4 MB / 112.5 MB`

**Crash suspect:** `lithium-fabric-mc1.21.0-0.12.2.jar`, exit code `255`

**Cloud:** `5.6 GB / 10.0 GB` (Captures 3.2, Assets 1.4, Locker 0.4, Configs 0.5,
Other <0.1, Free 4.4); gallery `3.8 GB / 10.0 GB`
