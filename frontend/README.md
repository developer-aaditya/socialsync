# 📱 Social Network Frontend

A fully functional React application built with Vite, consuming a Django REST Framework API secured with JWT authentication.

## 🎯 Features

✅ **Authentication**
- User signup and login with JWT
- Token storage in localStorage
- Auto-logout on 401 errors
- Token refresh mechanism

✅ **User Profile**
- View profile information
- Update full name and bio
- Email display (read-only)

✅ **Posts**
- Create posts with optional images
- View all posts in feed
- Like/unlike posts
- Delete own posts

✅ **Architecture**
- Context API for global state management
- useReducer for predictable state updates
- Custom useAuth hook for easy context access
- Axios interceptors for automatic token injection
- Conditional rendering for navigation (no React Router)

## 📦 Tech Stack

- **React 19** - UI Framework
- **Vite** - Build tool & dev server
- **Axios** - HTTP client
- **Context API** - State management
- **Plain CSS** - Styling (No Tailwind)

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn
- Django REST Framework backend running on `http://127.0.0.1:8000`

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Start development server:**
```bash
npm run dev
```

3. **Open browser:**
Navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

## 📁 Project Structure

```
src/
├── api/
│   ├── axiosInstance.js      # Axios instance with interceptors
│   ├── authApi.js            # Authentication API calls
│   └── postApi.js            # Posts API calls
├── context/
│   ├── AuthContext.jsx       # Auth context provider
│   └── authReducer.js        # Auth reducer logic
├── hooks/
│   └── useAuth.js            # Custom hook to use auth context
├── components/
│   ├── Navbar.jsx            # Navigation bar
│   ├── Loader.jsx            # Loading spinner
│   ├── PostForm.jsx          # Create post form
│   └── PostCard.jsx          # Individual post display
├── pages/
│   ├── Login.jsx             # Login page
│   ├── Signup.jsx            # Signup page
│   ├── Profile.jsx           # User profile page
│   └── PostFeed.jsx          # Posts feed page
├── styles/
│   ├── auth.css              # Auth pages styling
│   ├── navbar.css            # Navbar styling
│   ├── post.css              # Posts styling
│   └── profile.css           # Profile styling
├── utils/
│   └── tokenService.js       # Token management
├── App.jsx                   # Main app component
├── App.css                   # App styling
├── index.css                 # Global styling
└── main.jsx                  # Entry point
```

## 🔐 Authentication Flow

1. **Signup:** Create account → Store tokens → Redirect to Posts
2. **Login:** Authenticate → Store tokens → Redirect to Posts
3. **Token Management:** 
   - Access token automatically attached to all requests
   - 401 response triggers token refresh
   - Failed refresh clears tokens and reloads app
4. **Logout:** Clear tokens → Redirect to Login

## 🔄 API Integration

### Axios Instance
- Base URL: `http://127.0.0.1:8000/api/`
- Request Interceptor: Adds `Authorization: Bearer <token>`
- Response Interceptor: Handles 401 errors with token refresh

### API Endpoints Used

```
POST   /api/signup/              - Create new account
POST   /api/login/               - Login user
GET    /api/profile/             - Get user profile
PATCH  /api/profile/             - Update user profile
GET    /api/posts/               - Get all posts
POST   /api/posts/               - Create new post
DELETE /api/posts/{id}/          - Delete post
POST   /api/posts/{id}/like/     - Like a post
POST   /api/posts/{id}/dislike/  - Dislike a post
```

## 🎨 Styling

- **Pure CSS** - No Tailwind or external frameworks
- **Responsive Design** - Works on mobile and desktop
- **Modern UI** - Gradient buttons, smooth transitions
- **Emoji Icons** - User-friendly visual indicators

## 🛠️ Key Components

### AuthContext & useReducer
Manages global authentication state with actions:
- `LOGIN_SUCCESS` - User logged in
- `SIGNUP_SUCCESS` - User signed up
- `UPDATE_PROFILE` - Profile updated
- `LOGOUT` - User logged out
- `FETCH_PROFILE` - Load profile
- `AUTH_ERROR` - Authentication error

### Custom useAuth Hook
```javascript
const { user, isAuthenticated, loading, error, dispatch } = useAuth();
```

### Axios Interceptors
- **Request:** Attaches JWT token to Authorization header
- **Response:** Handles token expiration and refresh

## 📝 Usage Examples

### Login User
```javascript
import { useAuth } from './hooks/useAuth';
import authApi from './api/authApi';
import { tokenService } from './utils/tokenService';

const { dispatch } = useAuth();

const response = await authApi.login(email, password);
tokenService.setAccessToken(response.tokens.access);
tokenService.setRefreshToken(response.tokens.refresh);
dispatch({ type: 'LOGIN_SUCCESS', payload: response.user });
```

### Create Post
```javascript
import postApi from './api/postApi';

await postApi.createPost('Hello World', imageFile);
```

### Like Post
```javascript
await postApi.likePost(postId);
```

## ⚙️ Configuration

API base URL is hard-coded in `src/api/axiosInstance.js`:
```javascript
baseURL: 'http://127.0.0.1:8000/api/'
```

To change it, edit the `axiosInstance.js` file.

## 🚨 Error Handling

- **Network Errors:** Displayed to user in error messages
- **401 Unauthorized:** Automatically attempts token refresh
- **Form Validation:** Client-side validation before API calls
- **Optimistic Updates:** UI reflects changes before API confirmation

## 📱 Navigation

Navigation uses **conditional rendering** instead of React Router:
- `currentPage` state: `"login"` | `"signup"` | `"profile"` | `"posts"`
- `setCurrentPage()` function updates the current page
- Navbar changes visibility and content based on auth state

## 🐛 Troubleshooting

**API Connection Issues:**
- Ensure Django backend is running on `http://127.0.0.1:8000`
- Check CORS settings in Django backend
- Verify API endpoints match the specified format

**Token Not Persisting:**
- Check browser localStorage is enabled
- Clear localStorage and re-login: `localStorage.clear()`

**Not Authenticated After Refresh:**
- Tokens are read from localStorage on app load
- Check token expiration in browser DevTools

## 📚 Learning Resources

- React Hooks: https://react.dev/reference/react
- Context API: https://react.dev/reference/react/useContext
- Axios: https://axios-http.com/
- Vite: https://vitejs.dev/

## ✅ Production Checklist

- [ ] Environment variables configured (hard-coded currently)
- [ ] API URL updated for production
- [ ] CORS headers configured in Django
- [ ] Error logging implemented
- [ ] Performance monitoring setup
- [ ] Security headers configured
- [ ] Rate limiting implemented

## 📄 License

This project is provided as-is for learning and development purposes.

## 🤝 Support

For issues or questions about this application, refer to the source code comments and the project structure documentation above.

---

**Built with ❤️ using React + Vite + Django REST Framework**

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
