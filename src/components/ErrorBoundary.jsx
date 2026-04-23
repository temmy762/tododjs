import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[200px] p-8">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-2xl w-full text-left">
            <h3 className="text-red-400 font-bold text-lg mb-2">Something went wrong</h3>
            <p className="text-red-300 text-sm font-semibold mb-1">{this.state.error?.message || 'Unknown error'}</p>
            <pre className="text-red-400/60 text-xs overflow-auto max-h-48 bg-black/30 rounded p-3 mb-4 whitespace-pre-wrap">
              {this.state.error?.stack || 'No stack trace'}
            </pre>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
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
