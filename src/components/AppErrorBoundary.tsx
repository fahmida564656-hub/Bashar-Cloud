import React from 'react';

interface AppErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  AppErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Unexpected rendering error',
    };
  }

  componentDidCatch(error: Error) {
    console.error('AppErrorBoundary caught error:', error);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetAndReload = () => {
    try {
      localStorage.removeItem('gpcloud_files_v3_clean');
      localStorage.removeItem('gpcloud_recycle_bin_v3_clean');
      localStorage.removeItem('gpcloud_usage_v3_clean');
      localStorage.removeItem('bashar_cloud_theme');
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] bg-[#070b13] text-white flex items-center justify-center p-4">
          <div className="w-full max-w-[400px] rounded-3xl bg-[#0b111c] border border-sky-500/30 p-6 text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/35 flex items-center justify-center text-rose-400 text-xl font-bold">
              !
            </div>
            <h1 className="text-lg font-bold text-white">স্ক্রিন রিকভারি (Recovery Mode)</h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              অপ্রত্যাশিত সমস্যার কারণে পেজটি লোড হতে পারেনি। রিলোড করলে সব ফাইল আবার চলে আসবে।
            </p>
            <p className="text-[11px] text-rose-300/90 bg-rose-950/30 border border-rose-500/20 rounded-xl px-3 py-2 break-words">
              {this.state.message}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2.5 px-3 rounded-xl cursor-pointer"
              >
                রিলোড করুন
              </button>
              <button
                type="button"
                onClick={this.handleResetAndReload}
                className="flex-1 bg-[#142033] hover:bg-[#1b2c46] border border-[#243758] text-slate-200 text-xs font-semibold py-2.5 px-3 rounded-xl cursor-pointer"
              >
                ক্যাশ রিসেট
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
