const Loader = () => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5',
      }}
    >
      <div
        style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#007bff',
        }}
      >
        ⏳ Loading...
      </div>
    </div>
  );
};

export default Loader;
