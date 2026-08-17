# Smart Home Web Simulator - Complete Documentation

## Project Summary
A Next.js-based web application that simulates a smart home environment. The simulator provides a real-time visual representation of a multi-floor house with connected devices, including smart outlets, lighting systems, cameras, and safety equipment. It synchronizes with a Firebase backend to mirror the Android app's state in real time.

## Technology Stack
- **Framework**: Next.js 16.3.1
- **Language**: TypeScript 5
- **UI Library**: React 19.2.8
- **Styling**: Tailwind CSS 4
- **Backend/Database**: Firebase (Real-time Database & Authentication)
- **Linting**: ESLint 9
- **Package Manager**: npm

---

## Core Functionalities

### 1. Authentication System
**Location**: `app/login/page.tsx`

#### Features:
- **Email-based Authentication**: Sign in and sign up using email and password
- **User Account Management**: Create new accounts or log into existing ones
- **Firebase Auth Integration**: Uses Firebase Authentication for secure credential handling
- **Error Handling**: User-friendly error messages for various auth failures:
  - Invalid credentials
  - Email already in use
  - Weak password
  - Too many login attempts
- **Auto-redirect**: Authenticated users automatically redirect to home page
- **Mode Toggle**: Switch between Sign In and Sign Up modes
- **Password Validation**: Confirms password match for new accounts

#### Authentication Flow:
1. User lands on login page
2. Chooses Sign In or Sign Up mode
3. Enters email and password
4. Firebase validates credentials
5. On success: Auto-redirects to home page (`/`)
6. On failure: Displays descriptive error message

---

### 2. House Simulator Dashboard
**Location**: `app/page.tsx`

#### Overview:
Real-time visualization of a smart home with multiple floors, rooms, and connected devices. Each device displays live status, power consumption, and interactive controls.

#### Multi-Floor Architecture:
- **Ground Floor**: Living room, kitchen, front entrance
  - 10 devices including lights, outlets, appliances, cameras, and safety devices
  - Color accent: Orange (#ffb703)
  - Dimensions: 14x9 units

- **Upper Floor**: Bedrooms, study, hallway
  - 13 devices with multi-switch control panels
  - Color accent: Cyan (#00d4ff)
  - Dimensions: 14x9 units

#### Device Types:

| Device Type | Purpose | Examples |
|-------------|---------|----------|
| **Lighting** | Smart light bulbs and fixtures | Room lights, wall lights, accent LEDs |
| **Outlet** | Smart electrical plugs/sockets | TV outlet, refrigerator, microwave, chargers |
| **Multi-switch** | Gang boxes with multiple independent switches | Study gang box with 5 switches |
| **Camera** | Security and monitoring devices | Entrance camera, corridor camera |
| **Safety** | Safety-related devices | Iron station (auto-shutoff timer) |

#### Device Status Indicators:
- **ON**: Device is active (green indicator)
- **OFF**: Device is inactive (gray indicator)
- **ERROR**: Device malfunction (red indicator)
- **DISCONNECTED**: Device not connected (amber indicator)

#### Device Display Information:
- Device name and type
- Current status (ON/OFF/ERROR)
- Room location
- Power consumption in watts
- Real-time value indicator
- For cameras: Live snapshot preview
- For multi-switches: Individual switch states and labels
- For safety devices: Time limits and remaining minutes

#### Real-time Data Synchronization:
- Watches Firebase Realtime Database
- Automatically updates device states when changes occur
- Mirrors Android app state continuously
- Handles multiple data format variations from backend
- Normalizes inconsistent field naming conventions

#### Device State Normalization:
The simulator normalizes various Firebase data formats:
- Multiple naming conventions: `isOn`, `is_on`, `on`, `state`, `active`
- Power field variations: `power`, `wattage`, `powerWatts`, `currentPower`
- Device type detection from various field names
- Flexible floor reference matching (ground, upper, first, second)

#### UI Components:
- **Floor Cards**: Each floor displayed as a separate section with subtitle and devices
- **Device Cards**: Color-coded by device type with status badges
- **Power Meter**: Shows total power consumption across all devices
- **Status Colors**:
  - Cyan: Camera devices
  - Orange: Safety devices
  - Fuchsia: Multi-switch panels
  - Yellow: Lighting
  - White/Gray: Standard outlets

#### Fallback System:
- Pre-configured default device layout if Firebase is not configured
- Simulates realistic smart home scenarios
- Includes mock camera feeds from Unsplash
- Useful for testing UI without backend

---

### 3. Firebase Real-time Synchronization
**Location**: `app/firebase.ts`

#### Configuration:
```javascript
{
  apiKey: Firebase API key
  authDomain: "smart-home-app-eaeaa.firebaseapp.com"
  databaseURL: "https://smart-home-app-eaeaa-default-rtdb.firebaseio.com"
  projectId: "smart-home-app-eaeaa"
  storageBucket: Firebase storage bucket
  messagingSenderId: FCM sender ID
  appId: Firebase app ID
  measurementId: Google Analytics measurement ID
}
```

#### Capabilities:
- Initializes Firebase app on first load
- Provides Firebase app instance to other components
- Enables authentication flow
- Connects to Realtime Database for device state synchronization
- Caches Firebase app instance for performance

#### Real-time Listener:
- Subscribes to database changes
- Listens for house state updates
- Responds immediately to any device state change
- Maintains connection until user signs out

---

### 4. Authentication State Management
**Location**: `app/page.tsx`

#### Features:
- **Session Tracking**: Monitors authentication state in real-time
- **Logout Functionality**: Sign out button that clears auth session
- **Protected Route**: Home page requires authentication
- **State Persistence**: Maintains login session across page refreshes
- **Auto-redirect**: Unauthenticated users redirected to login page

#### Logout Flow:
1. User clicks sign-out button
2. Firebase clears authentication
3. App redirects to login page
4. Session ends

---

### 5. Responsive User Interface
**Location**: `app/globals.css`, styled with Tailwind CSS

#### Design Features:
- **Dark Theme**: Professional dark background with accent colors
- **Visual Hierarchy**: Clear distinction between floors and devices
- **Color Coding**: Device types color-coded for quick identification
- **Status Badges**: Status indicators for each device
- **Mobile Responsive**: Adapts to different screen sizes
- **Accessibility**: Semantic HTML, readable text colors
- **Performance**: Optimized CSS with Tailwind's production build

---

### 6. Data Normalization Engine

#### Purpose:
Handles inconsistencies between Android app data format and web simulator expectations.

#### Normalization Features:

**Device Fields Normalized**:
- `id`: Device identifier
- `name`: User-friendly name (handles: deviceName, device_name, title, label)
- `kind`: Device type classification (Lighting, Outlet, Camera, Safety, Multi-switch)
- `room`: Room location (handles: roomName, room_name, location)
- `floor`: Floor level (handles: floorId, floor_id, floorName, floor_name, floorLevel, floorIndex)
- `status`: Current state (handles: state, deviceState, device_state, powerState, isOn, is_on, on, active)
- `powerWatts`: Power consumption (handles: power, wattage, currentPower)
- `value`: Display status message
- `active`: Boolean active state
- `cameraSnapshot`: Image URL for camera preview
- `cameraStream`: Camera stream URL
- `switches`: Multi-switch array

**Status Conversion Logic**:
- Converts boolean, number, and string values to standardized status
- Interprets: 1/0, true/false, "on"/"off", "active"/"inactive"
- Detects disconnected devices

**Device Type Detection**:
- Analyzes device names for keywords
- Categories: Camera, Lighting, Multi-switch, Safety, Outlet (default)
- Case-insensitive keyword matching

---

### 7. Multi-Floor Layout System

#### Floor Organization:
- Automatic device distribution across floors
- Customizable floor dimensions (width × height)
- Floor-specific accent colors for visual distinction
- Optional floor image backgrounds

#### Floor Reference Matching:
- Intelligent floor alias resolution
- Supports multiple naming schemes:
  - Numeric indices: 0, 1
  - Common names: "ground", "upper", "first", "second"
  - Custom floor names from database
  - Case-insensitive matching with flexible delimiters

#### Device Distribution:
- Devices automatically assigned to correct floor
- Falls back to floor index if unclear
- Merges devices from both fallback and Firebase sources
- Prevents device duplication

---

### 8. Security Features

#### Authentication Security:
- Password-protected user accounts
- Firebase Authentication backend
- Secure credential transmission
- Session-based access control

#### Data Security:
- Firebase Realtime Database security rules (configurable)
- User-specific data visibility
- Protected API credentials in environment variables

---

## File Descriptions

| File | Purpose |
|------|---------|
| `app/page.tsx` | Main house simulator dashboard with device visualization and real-time sync |
| `app/login/page.tsx` | Authentication interface for sign in/sign up |
| `app/firebase.ts` | Firebase app initialization and configuration |
| `app/layout.tsx` | Root layout wrapper for all pages |
| `app/globals.css` | Global CSS styles and theme |
| `next.config.ts` | Next.js framework configuration |
| `tailwind.config.ts` | Tailwind CSS customization |
| `tsconfig.json` | TypeScript compiler options |
| `eslint.config.mjs` | Code linting rules and standards |

---

## Project Structure

```
web-simulator-for-the-smart-home-app/
├── backend/                    # Next.js application
│   ├── app/                   # Application source code
│   │   ├── firebase.ts        # Firebase initialization
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Main dashboard (23+ devices)
│   │   ├── login/
│   │   │   └── page.tsx       # Authentication page
│   │   ├── public/            # Static assets
│   │   └── favicon.ico
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── eslint.config.mjs
│   ├── postcss.config.mjs
│   ├── package.json
│   └── README.md
├── package.json               # Workspace root
└── README.md

```

---

## Available Commands

From workspace root:
```bash
npm run dev       # Start development server (port 3000)
npm run build     # Build for production
npm run lint      # Run ESLint checks
```

---

## Development Setup

1. **Configure Firebase Environment Variables** (`.env.local`):
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_database_url
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. **Access Application**:
   ```
   http://localhost:3000
   ```

---

## Routes & Navigation

| Route | Component | Purpose | Auth Required |
|-------|-----------|---------|---|
| `/` | `page.tsx` | Smart home dashboard with devices | Yes |
| `/login` | `login/page.tsx` | User authentication | No |

---

## Data Flow

```
Firebase Realtime Database
        ↓
onValue() listener
        ↓
Normalize data formats
        ↓
Organize devices into floors
        ↓
Update React state
        ↓
Re-render device cards
        ↓
Display on dashboard
```

---

## Device Status Update Flow

1. **User/Android App Updates Device** in Firebase
2. **Listener Detects Change** via onValue() callback
3. **App Normalizes Data** from various formats
4. **State Updates** trigger React re-render
5. **UI Reflects Change** immediately
6. **User Sees Live Status** on dashboard

---

## Fallback Behavior

When Firebase is not configured or unavailable:
- Application displays pre-configured device layout
- 23 mock devices across 2 floors
- Mock camera images from Unsplash
- Real UI interaction patterns
- Useful for testing without backend

---

## Type System

The application uses TypeScript types for type safety:

- `DeviceStatus`: "ON" | "OFF" | "ERROR" | "DISCONNECTED"
- `DeviceKind`: "Outlet" | "Multi-switch" | "Lighting" | "Safety" | "Camera"
- `Device`: Complete device information
- `FloorPlan`: Floor layout with devices
- `RealtimeDevice`: Firebase device schema (flexible)
- `RealtimeFloor`: Firebase floor schema (flexible)
- `RealtimeHouseState`: Complete house state structure

---

## Performance Optimizations

- Firebase listener auto-cleanup on component unmount
- Memoized calculations for floor organization
- Efficient re-render only when data changes
- Lazy loading of camera snapshots
- CSS optimization via Tailwind

---

## Error Handling

- **Auth Errors**: Readable error messages for login failures
- **Disconnected Devices**: Status indicator for connectivity issues
- **Missing Data**: Fallback values for incomplete device info
- **Format Variations**: Automatic normalization of inconsistent data
- **Session Loss**: Auto-redirect to login on auth state change

---

## Browser Support

- Modern browsers with ES2020+ support
- Next.js framework handles compatibility
- Responsive design for mobile and desktop
- Progressive enhancement approach

---

## Related Documentation

- [Backend README](backend/README.md)
- [Root README](README.md)
- [Agents Documentation](backend/AGENTS.md)
- [Claude Implementation Notes](backend/CLAUDE.md)
