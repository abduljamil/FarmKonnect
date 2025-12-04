import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Card from '../components/Card';

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token) {
      navigate('/signin');
      return;
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/signin');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-8 py-10">
        <div className="text-center">
          <h2 className="text-5xl font-bold text-gray-800 mb-2">Welcome to FarmKonnect! 🌱</h2>
          <p className="text-lg text-gray-600 mb-10">Your AI-Powered Agricultural Marketplace</p>
          
          <Card title="Account Information" variant="info" className="max-w-2xl mx-auto mb-10 text-left">
            <div className="flex justify-between py-3 border-b border-gray-200">
              <span className="font-semibold text-gray-600">Name:</span>
              <span className="text-gray-800">{user.name}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-200">
              <span className="font-semibold text-gray-600">Email:</span>
              <span className="text-gray-800">{user.email}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-200">
              <span className="font-semibold text-gray-600">Role:</span>
              <span className="text-gray-800 capitalize">{user.role}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="font-semibold text-gray-600">User ID:</span>
              <span className="text-gray-800">{user.id}</span>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
            <Card variant="feature">
              <h4 className="text-xl font-semibold mb-3 text-primary-800">🛒 Browse Products</h4>
              <p className="text-gray-600 leading-relaxed m-0">Explore fresh agricultural products from local farmers</p>
            </Card>
            <Card variant="feature">
              <h4 className="text-xl font-semibold mb-3 text-primary-800">🤖 AI Assistant</h4>
              <p className="text-gray-600 leading-relaxed m-0">Get smart recommendations powered by AI</p>
            </Card>
            <Card variant="feature">
              <h4 className="text-xl font-semibold mb-3 text-primary-800">📊 Analytics</h4>
              <p className="text-gray-600 leading-relaxed m-0">Track your orders and market trends</p>
            </Card>
            <Card variant="feature">
              <h4 className="text-xl font-semibold mb-3 text-primary-800">💬 Connect</h4>
              <p className="text-gray-600 leading-relaxed m-0">Message directly with farmers and buyers</p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
