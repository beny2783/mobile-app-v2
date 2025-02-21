import { useState, useCallback, useRef, useEffect } from 'react';
import { authRepository } from '../../repositories/auth';

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
  const mountedRef = useRef(false);

  useEffect(() => {
    console.log('🎣 useDataFetching: Component mounted');
    mountedRef.current = true;

    // Initial fetch after mount
    fetch(false, 0);

    return () => {
      console.log('🎣 useDataFetching: Cleanup - component unmounting');
      mountedRef.current = false;
    };
  }, []);

  const fetch = useCallback(
    async (isRefreshing = false, retryCount = 0) => {
      if (!mountedRef.current) {
        console.log('🎣 useDataFetching: Skipping fetch - component not mounted');
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
        } else {
          setState((prev) => ({ ...prev, refreshing: true, error: null }));
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
          console.log('🎣 useDataFetching: Skipping state update - component not mounted');
          return;
        }

        const transformedData = optionsRef.current.transform
          ? optionsRef.current.transform(result)
          : result;

        setState((prev) => ({
          ...prev,
          data: transformedData,
          loading: false,
          refreshing: false,
          error: null,
        }));

        if (optionsRef.current.onSuccess) {
          optionsRef.current.onSuccess(transformedData);
        }
      } catch (error) {
        console.error('❌ Data fetching error:', error);

        if (!mountedRef.current) {
          console.log('🎣 useDataFetching: Skipping error state update - component not mounted');
          return;
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        setState((prev) => ({
          ...prev,
          loading: false,
          refreshing: false,
          error: errorMessage,
        }));

        if (optionsRef.current.onError) {
          optionsRef.current.onError(error);
        }

        // Retry logic for non-refresh fetches
        if (!isRefreshing && optionsRef.current.retryOnError && retryCount < 2) {
          console.log(`🔄 Retrying fetch (attempt ${retryCount + 1})...`);
          setTimeout(() => fetch(false, retryCount + 1), 1000 * (retryCount + 1));
        }
      }
    },
    [fetchFunction]
  );

  const refresh = useCallback(() => {
    console.log('🔄 Manual refresh triggered');
    return fetch(true, 0);
  }, [fetch]);

  return {
    ...state,
    refresh,
    fetch,
  };
}
