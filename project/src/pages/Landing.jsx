
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator,
  BarChart3,
  MessageCircle,
  FileText,
  ArrowRight,
  Zap,
  Target,
  Brain,
  CheckCircle,
  Sparkles,
  TrendingUp,
  Activity
} from 'lucide-react';

const features = [
  {
    icon: Calculator,
    title: 'Productivity Calculation',
    description: 'Advanced algorithms track and calculate your productivity metrics with precision.',
    color: 'from-blue-500 to-cyan-400',
    link: '/calculate'
  },
  {
    icon: BarChart3,
    title: 'AI Analysis',
    description: 'Get intelligent insights and predictions about your productivity patterns.',
    color: 'from-purple-500 to-pink-400',
    link: '/analyze'
  },
  {
    icon: MessageCircle,
    title: 'Productivity Chatbot',
    description: 'Chat with AI about your productivity data and get personalized recommendations.',
    color: 'from-green-500 to-emerald-400',
    link: '/chatbot'
  },
  {
    icon: FileText,
    title: 'AI Agent Reports',
    description: 'Generate comprehensive reports and action plans with AI agents.',
    color: 'from-orange-500 to-red-400',
    link: '/reports'
  }
];

const benefits = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Get instant productivity calculations and AI insights in real-time.',
    color: 'text-yellow-400'
  },
  {
    icon: Brain,
    title: 'AI-Powered',
    description: 'Advanced machine learning algorithms provide intelligent recommendations.',
    color: 'text-purple-400'
  },
  {
    icon: Target,
    title: 'Goal-Oriented',
    description: 'Set targets and track progress with personalized action plans.',
    color: 'text-pink-400'
  }
];

const offerings = [
  'Productivity Chat Bot',
  'Productivity Prediction',
  'Productivity Gaps and Anomalies',
  'Productivity Analytics',
  'Agentic AI to Drive Productivity'
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Floating Orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-pink-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
        
        {/* Gradient Lines */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent animate-shimmer"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent animate-shimmer-delayed"></div>
        
        {/* Floating Particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-400/40 rounded-full animate-particle-1"></div>
        <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-blue-400/40 rounded-full animate-particle-2"></div>
        <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-pink-400/40 rounded-full animate-particle-3"></div>
        <div className="absolute top-2/3 right-1/4 w-2 h-2 bg-cyan-400/40 rounded-full animate-particle-4"></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      </div>

      {/* Hero Section */}
      <div className="relative">
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16 animate-fade-in">
            <div className="flex items-center justify-center mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 animate-glow">
                <Sparkles className="text-yellow-400 animate-spin-slow" size={32} />
              </div>
            </div>

            <h1 className="text-6xl md:text-8xl font-black text-white mb-6 leading-tight animate-slide-up">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-gradient">
                Productix
              </span>
            </h1>

            <div className="flex items-center justify-center gap-3 mb-8 animate-slide-up-delayed">
              <Activity className="w-6 h-6 text-purple-400 animate-pulse" />
              <p className="text-2xl md:text-3xl font-light text-white/80">
                Your Ultimate Productivity Co-Pilot
              </p>
            </div>

            <div className="max-w-4xl mx-auto mb-12 animate-fade-in-delayed">
              <p className="text-xl md:text-2xl text-white/60 font-light leading-relaxed mb-8">
                Are YOU Stuck in Low Efficiency, Order Delays and Need to Find
                <span className="font-semibold text-white"> Productivity Booster</span>?
              </p>

              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 p-8 hover:border-purple-500/30 transition-all duration-500">
                <p className="text-lg text-white/80 mb-6">
                  Productix AI is <span className="font-bold text-purple-400">YOUR</span> Productivity Co-Pilot
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <span className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-2 rounded-xl text-sm font-medium animate-bounce-subtle">
                    Insight Focused
                  </span>
                  <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-2 rounded-xl text-sm font-medium animate-bounce-subtle-delayed">
                    Efficiency Oriented
                  </span>
                  <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 px-4 py-2 rounded-xl text-sm font-medium animate-bounce-subtle-more-delayed">
                    Results Driven
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <Link
                to="/login"
                className="group px-10 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2 animate-pulse-glow"
              >
                Login
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>

              
            </div>
          </div>

          {/* What Productix Offers */}
          <div className="max-w-3xl mx-auto mb-20">
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 p-8 hover:border-emerald-500/30 transition-all duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-emerald-500/10 animate-pulse">
                  <TrendingUp className="text-emerald-400" size={24} />
                </div>
                <h2 className="text-2xl font-bold text-white">
                  What Productix AI Offers
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {offerings.map((offering, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-all duration-300 hover:translate-x-1"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <CheckCircle className="text-emerald-400 flex-shrink-0 animate-check" size={20} />
                    <span className="text-white/80 font-medium text-left">{offering}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 animate-fade-in">
              Powerful Features
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Everything you need to optimize your productivity and increase your profitibility.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Link
                key={index}
                to={feature.link}
                className="group bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:border-purple-500/30 transition-all duration-300 hover:scale-105 hover:-translate-y-2"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                  <feature.icon className="text-white" size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-400 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-20 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Why Choose Productix
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div 
                key={index} 
                className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 p-8 hover:border-white/20 transition-all duration-300 group hover:-translate-y-2"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="flex items-center justify-center mb-6">
                  <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                    <benefit.icon className={`${benefit.color}`} size={32} />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 text-center">
                  {benefit.title}
                </h3>
                <p className="text-white/60 text-center leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 relative">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 backdrop-blur-xl rounded-2xl p-12 text-center hover:border-purple-500/40 transition-all duration-500 animate-glow">
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Boost Your Productivity?
            </h2>
            <p className="text-xl text-white/70 mb-8">
              Join thousand of businesses who are optimizing their operations with AI
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/login"
                className="group px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
              >
                Start Now
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -30px) scale(1.1); }
        }

        @keyframes float-delayed {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 30px) scale(1.1); }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes shimmer-delayed {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }

        @keyframes particle-1 {
          0%, 100% { transform: translate(0, 0); opacity: 0; }
          50% { transform: translate(100px, -100px); opacity: 1; }
        }

        @keyframes particle-2 {
          0%, 100% { transform: translate(0, 0); opacity: 0; }
          50% { transform: translate(-80px, 120px); opacity: 1; }
        }

        @keyframes particle-3 {
          0%, 100% { transform: translate(0, 0); opacity: 0; }
          50% { transform: translate(120px, 80px); opacity: 1; }
        }

        @keyframes particle-4 {
          0%, 100% { transform: translate(0, 0); opacity: 0; }
          50% { transform: translate(-100px, -90px); opacity: 1; }
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.3); }
          50% { box-shadow: 0 0 40px rgba(168, 85, 247, 0.6); }
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 4px 20px rgba(168, 85, 247, 0.3); }
          50% { box-shadow: 0 8px 40px rgba(168, 85, 247, 0.6); }
        }

        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        @keyframes check {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }

        .animate-float { animation: float 8s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 10s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 6s ease-in-out infinite; }
        .animate-shimmer { animation: shimmer 3s linear infinite; }
        .animate-shimmer-delayed { animation: shimmer-delayed 4s linear infinite; }
        .animate-particle-1 { animation: particle-1 8s ease-in-out infinite; }
        .animate-particle-2 { animation: particle-2 10s ease-in-out infinite 1s; }
        .animate-particle-3 { animation: particle-3 12s ease-in-out infinite 2s; }
        .animate-particle-4 { animation: particle-4 9s ease-in-out infinite 3s; }
        .animate-fade-in { animation: fade-in 0.8s ease-out; }
        .animate-fade-in-delayed { animation: fade-in 1s ease-out 0.3s both; }
        .animate-slide-up { animation: slide-up 0.8s ease-out; }
        .animate-slide-up-delayed { animation: slide-up 1s ease-out 0.2s both; }
        .animate-gradient { background-size: 200% 200%; animation: gradient 3s ease infinite; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-glow { animation: glow 3s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .animate-bounce-subtle { animation: bounce-subtle 3s ease-in-out infinite; }
        .animate-bounce-subtle-delayed { animation: bounce-subtle 3s ease-in-out infinite 0.3s; }
        .animate-bounce-subtle-more-delayed { animation: bounce-subtle 3s ease-in-out infinite 0.6s; }
        .animate-check { animation: check 0.5s ease-out; }

        .bg-grid-pattern {
          background-image: 
            linear-gradient(rgba(168, 85, 247, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168, 85, 247, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>
    </div>
  );
};

export default Landing;