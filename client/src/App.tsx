function App() {
  return (
    <div style={{ 
      padding: '40px', 
      fontFamily: 'Inter, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>GPNet2 Dashboard</h1>
      <p style={{ fontSize: '16px', marginBottom: '10px' }}>✅ React is working</p>
      <p style={{ fontSize: '16px', marginBottom: '10px' }}>✅ Server is running on port 5000</p>
      <button 
        onClick={() => alert('Button clicked!')}
        style={{
          padding: '10px 20px',
          fontSize: '14px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          marginTop: '20px'
        }}
      >
        Test Button
      </button>
    </div>
  );
}

export default App;
