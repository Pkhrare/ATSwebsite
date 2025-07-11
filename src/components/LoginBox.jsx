import React from 'react';
import { useAuth } from '../context/AuthContext'; // adjust path if needed

export default function LoginBox() {
  const { userName, setUserName, password, setPassword, login } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    login(); // call login from context
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="w-full max-w-sm rounded-2xl shadow-lg bg-yellow-100 border-2 border-black p-8 relative">
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black p-4 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 11c1.1046 0 2 .8954 2 2v2a2 2 0 11-4 0v-2c0-1.1046.8954-2 2-2zm0-4a4 4 0 014 4v1H8v-1a4 4 0 014-4z" />
          </svg>
        </div>

        <h2 className="text-center text-xl font-bold text-black mt-10 mb-6">Login Now</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-black font-medium mb-1">Username *</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your Username"
              className="w-full px-4 py-2 border border-black rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div className="mb-4">
            <label className="block text-black font-medium mb-1">Password *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your Password"
              className="w-full px-4 py-2 border border-black rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div className="flex items-center mb-4">
            <input type="checkbox" id="remember" className="mr-2" />
            <label htmlFor="remember" className="text-black text-sm">Remember me</label>
          </div>

          <button type="submit" className="w-full bg-black text-yellow-300 py-2 rounded-md font-semibold hover:bg-yellow-400 hover:text-black transition">
            LOGIN
          </button>
        </form>

        <div className="flex justify-between text-sm text-black mt-4">
          <a href="#" className="hover:underline">Don't have an account?</a>
          <a href="#" className="hover:underline">Forgot password?</a>
        </div>

        <p className="text-xs text-center text-gray-500 mt-4">
          Image from <a href="https://freepik.com" className="underline">Freepik</a>
        </p>
      </div>
    </div>
  );
}
