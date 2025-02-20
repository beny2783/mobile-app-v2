import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authRepository } from '../../../repositories/auth';
import type { AuthState, SignInWithEmailPayload } from './types';

const initialState: AuthState = {
  user: null,
  session: null,
  loading: true,
  error: null,
};

// Async Thunks
export const checkUser = createAsyncThunk('auth/checkUser', async (_, { rejectWithValue }) => {
  try {
    const session = await authRepository.getSession();
    return {
      session,
      user: session?.user ?? null,
    };
  } catch (error: any) {
    if (error.code === 'user_not_found' && error.message.includes('JWT')) {
      return rejectWithValue('Your session has expired. Please sign in again.');
    }
    return rejectWithValue(error.message || 'Authentication error');
  }
});

export const signInWithEmail = createAsyncThunk(
  'auth/signInWithEmail',
  async ({ email, password }: SignInWithEmailPayload, { dispatch, rejectWithValue }) => {
    try {
      await authRepository.signIn(email, password);
      const result = await dispatch(checkUser()).unwrap();
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Sign in failed');
    }
  }
);

export const signInWithGoogle = createAsyncThunk(
  'auth/signInWithGoogle',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      await authRepository.signInWithGoogle();
      const result = await dispatch(checkUser()).unwrap();
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Google sign in failed');
    }
  }
);

export const signOut = createAsyncThunk('auth/signOut', async (_, { rejectWithValue }) => {
  try {
    await authRepository.signOut();
    return null;
  } catch (error: any) {
    return rejectWithValue(error.message || 'Sign out failed');
  }
});

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
    setSession: (state, action) => {
      state.session = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Check User
    builder
      .addCase(checkUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.error = null;
      })
      .addCase(checkUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        if (action.payload === 'Your session has expired. Please sign in again.') {
          state.user = null;
          state.session = null;
        }
      });

    // Sign In with Email
    builder
      .addCase(signInWithEmail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signInWithEmail.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.error = null;
      })
      .addCase(signInWithEmail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Sign In with Google
    builder
      .addCase(signInWithGoogle.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signInWithGoogle.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.error = null;
      })
      .addCase(signInWithGoogle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Sign Out
    builder
      .addCase(signOut.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.session = null;
        state.error = null;
      })
      .addCase(signOut.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setUser, setSession } = authSlice.actions;
export default authSlice.reducer;
