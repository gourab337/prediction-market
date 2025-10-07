import { useState } from 'react'
import { Header } from '@/components/Header'
import { MarketsPage } from '@/components/MarketsPage'
import { PortfolioPage } from '@/components/PortfolioPage'
import { LeaderboardPage } from '@/components/LeaderboardPage'

type PageType = 'markets' | 'portfolio' | 'leaderboard';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('markets');

  const handleNavigate = (page: PageType) => {
    setCurrentPage(page);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'markets':
        return <MarketsPage />;
      case 'portfolio':
        return <PortfolioPage />;
      case 'leaderboard':
        return <LeaderboardPage />;
      default:
        return <MarketsPage />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        currentPage={currentPage} 
        onNavigate={handleNavigate} 
      />
      <main>
        {renderCurrentPage()}
      </main>
    </div>
  )
}

export default App
