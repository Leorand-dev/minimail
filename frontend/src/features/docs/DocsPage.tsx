import React from 'react';

export default function DocsPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-white min-w-0 p-6">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">📄</div>
        <h2 className="text-lg font-semibold text-gray-700 mb-2">API 文档</h2>
        <p className="text-sm text-gray-400 mb-6">
          完整的 REST API 文档，包含所有端点、参数、请求和响应示例
        </p>
        <a
          href="/redoc"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#066da5] text-white text-sm font-medium rounded-lg hover:bg-[#05588a] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          在新窗口打开 API 文档
        </a>
        <div className="mt-6 text-xs text-gray-400 space-y-2">
          <p>也可直接访问后端地址:</p>
          <code className="block px-3 py-2 bg-gray-50 border border-gray-200 rounded select-all">
            {window.location.protocol.replace('http', '') ? window.location.protocol.replace('http', '') : ''}{window.location.hostname}:8000/redoc
          </code>
        </div>
      </div>
    </div>
  );
}
