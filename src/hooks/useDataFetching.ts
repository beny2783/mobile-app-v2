import { useState, useCallback, useRef, useEffect } from 'react';
import { authRepository } from '../repositories/auth';

interface FetchState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
}

interface FetchOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  transform?: (data: any) => any;
  retryOnError?: boolean;
}

export function useDataFetching<T>(
  initialData: T,
  fetchFunction: () => Promise<T>,
  options: FetchOptions = {}
) {
  console.log('🎣 useDataFetching: Hook initialized', {
    hasInitialData: !!initialData,
    hasTransform: !!options.transform,
    hasCallbacks: {
      success: !!options.onSuccess,
      error: !!options.onError,
    },
  });

  const [state, setState] = useState<FetchState<T>>({
    data: initialData,
    loading: true,
    error: null,
    refreshing: false,
  });

  // Use refs to prevent unnecessary re-renders from options changes
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Use ref for state to avoid callback dependencies
  const stateRef = useRef(state);
  stateRef.current = state;

  // Track mount status
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      console.log('🎣 useDataFetching: Cleanup - component unmounting');
      mountedRef.current = false;
    };
  }, []);

  const fetch = useCallback(
    async (isRefreshing = false, retryCount = 0) => {
      if (!mountedRef.current) {
        console.log('🎣 useDataFetching: Skipping fetch - component unmounted');
        return;
      }

      try {
        console.log(`🔄 ${isRefreshing ? 'Refreshing' : 'Fetching'} data...`, {
          isRefreshing,
          retryCount,
          currentState: {
            loading: stateRef.current.loading,
            error: stateRef.current.error,
            dataExists: !!stateRef.current.data,
          },
        });

        if (!isRefreshing) {
          setState((prev) => ({ ...prev, loading: true, error: null }));
        }

        const user = await authRepository.getUser();

        if (!user) {
          console.error('❌ Authentication error: No user found');
          throw new Error('Authentication required');
        }

        console.log('👤 User authenticated:', user.id);
        const result = await fetchFunction();
        console.log('✅ Data fetched successfully', {
          hasData: !!result,
          isArray: Array.isArray(result),
          length: Array.isArray(result) ? result.length : 'N/A',
        });

        if (!mountedRef.current) {
          console.log('🎣 useDataFetching: Skipping state update - component unmounted');
          return;
        }

        const transformedData = optionsRef.current.transform
          ? optionsRef.current.transform(result)
          : result;
        console.log('🔄 Data processed:', {
          wasTransformed: !!optionsRef.current.transform,
          rawCount: Array.isArray(result) ? result.length : 'N/A',
          transformedCount: Array.isArray(transformedData) ? transformedData.length : 'N/A',
        });

        setState((prev) => {
          console.log('🔄 Updating state:', {
            previousState: {
              loading: prev.loading,
              error: prev.error,
              dataExists: !!prev.data,
            },
            newState: {
              loading: false,
              error: null,
              dataExists: !!transformedData,
            },
          });
          return {
            ...prev,
            data: transformedData,
            loading: false,
            refreshing: false,
            error: null,
          };
        });

        optionsRef.current.onSuccess?.(transformedData);
      } catch (error) {
        console.error('❌ Data fetching error:', error, {
          isRefreshing,
          retryCount,
        });

        const errorMessage = error instanceof Error ? error.message : 'An error occurred';

        if (!mountedRef.current) {
          console.log('🎣 useDataFetching: Skipping error state update - component unmounted');
          return;
        }

        // If retryOnError is enabled and we haven't exceeded retry attempts
        if (optionsRef.current.retryOnError && retryCount < 2) {
          console.log(`🔄 Retrying fetch (attempt ${retryCount + 1})...`);
          setTimeout(
            () => {
              fetch(isRefreshing, retryCount + 1);
            },
            Math.min(1000 * Math.pow(2, retryCount), 5000)
          ); // Exponential backoff with max 5s
          return;
        }

        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
          refreshing: false,
          // Keep previous data on error
          data: prev.data,
        }));

        optionsRef.current.onError?.(error);
      }
    },
    [fetchFunction]
  ); // Only depend on fetchFunction

  const refresh = useCallback(() => {
    console.log('🔄 Starting data refresh...', {
      currentState: {
        loading: stateRef.current.loading,
        error: stateRef.current.error,
        dataExists: !!stateRef.current.data,
      },
    });
    setState((prev) => ({ ...prev, refreshing: true }));
    fetch(true);
  }, [fetch]);

  console.log('🎣 useDataFetching: Returning state:', {
    loading: state.loading,
    error: state.error,
    refreshing: state.refreshing,
    hasData: !!state.data,
  });

  return {
    ...state,
    fetch,
    refresh,
  };
}
