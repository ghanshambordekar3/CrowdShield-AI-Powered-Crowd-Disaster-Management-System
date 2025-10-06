import { useEffect } from 'react';

export default function AppPreview() {
  useEffect(() => {
    // Load the original HTML content into an iframe for preview
    const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
    if (iframe) {
      // The iframe will load the index.html file
      iframe.src = '/index.html';
    }
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh', margin: 0, padding: 0 }}>
      <div style={{ 
        padding: '10px', 
        background: '#f3f4f6', 
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '14px', color: '#374151' }}>
          CrowdShield Frontend Preview - Bug Fixes Applied
        </h3>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>
          ✅ Mobile/Tablet Responsive | ✅ Dark/Light Mode | ✅ Fixed Alerts | ✅ Fixed Dashboard
        </div>
      </div>
      <iframe
        id="preview-iframe"
        title="CrowdShield Preview"
        style={{
          width: '100%',
          height: 'calc(100vh - 50px)',
          border: 'none',
          display: 'block'
        }}
      />
    </div>
  );
}