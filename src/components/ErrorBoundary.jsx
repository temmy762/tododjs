import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const stack = errorInfo?.componentStack || '';
    this.setState({ componentStack: stack });

    // Normalise non-Error thrown values before logging
    const display = (error instanceof Error)
      ? error
      : new Error(`Non-Error thrown: ${JSON.stringify(error)}`);
    console.error('[ErrorBoundary]', display, stack);
  }

  render() {
    if (this.state.hasError) {
      const { error, componentStack } = this.state;

      // Extract the deepest component name from the stack for a quick hint
      const firstComponent = componentStack
        ? (componentStack.match(/at (\w+)/) || [])[1] || ''
        : '';

      // Friendly message for non-Error thrown values (e.g. React Router internals)
      const message = (error instanceof Error)
        ? error.message
        : typeof error === 'object' && error !== null
          ? `Internal object thrown${firstComponent ? ` in <${firstComponent}>` : ''} — try refreshing`
          : String(error) || 'Unknown error';

      const stack = (error instanceof Error) ? error.stack : null;

      return (
        <div className="flex items-center justify-center min-h-[200px] p-8">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-2xl w-full text-left">
            <h3 className="text-red-400 font-bold text-lg mb-2">Something went wrong</h3>
            <p className="text-red-300 text-sm font-semibold mb-1">{message}</p>
            {stack && (
              <pre className="text-red-400/60 text-xs overflow-auto max-h-48 bg-black/30 rounded p-3 mb-4 whitespace-pre-wrap">
                {stack}
              </pre>
            )}
            <button
              onClick={() => this.setState({ hasError: false, error: null, componentStack: null })}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
