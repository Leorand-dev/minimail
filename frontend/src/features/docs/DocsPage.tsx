import React from 'react';

export default function DocsPage() {
  return (
    <div className="flex flex-1 flex-col min-w-0">
      <iframe
        src="/redoc"
        className="w-full flex-1 border-0"
        title="API 文档"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
