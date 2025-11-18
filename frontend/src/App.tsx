import { useState, useEffect } from 'react'
import api from './services/api'
import './App.css'

interface NewProduct {
  _id: string;
  bank: string[];
  product_name: string;
  product_segment: string;
  product_category: string;
  description: string;
  date_published: string;
  source_type: string;
  source_url: string;
  pdf_file_name: string;
  timestamp: string;
}

interface MarketTrend {
  _id: string;
  topic_group: string;
  title: string;
  summary: string;
  bank_related: string[];
  impact_level: string;
  source_type: string;
  source_url: string;
  published_date: string;
  extracted_from_pdf: boolean;
  pdf_file_name: string;
  timestamp: string;
}

interface FintechNews {
  _id: string;
  fintech_topic: string;
  title: string;
  summary: string;
  organization: string;
  impact_area: string;
  source_type: string;
  source_url: string;
  published_date: string;
  extracted_from_pdf: boolean;
  pdf_file_name: string;
  timestamp: string;
}

function App() {
  const [newProducts, setNewProducts] = useState<NewProduct[]>([]);
  const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
  const [fintechNews, setFintechNews] = useState<FintechNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'trends' | 'fintech'>('products');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/data/all');

      if (response.data.success) {
        setNewProducts(response.data.data.newProducts || []);
        setMarketTrends(response.data.data.marketTrends || []);
        setFintechNews(response.data.data.fintechNews || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading data from MongoDB...</h2>
        <p>Connecting to database...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={fetchAllData}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>HDBank Market News - Database Dashboard</h1>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={() => setActiveTab('products')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'products' ? '#007bff' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          New Products ({newProducts.length})
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'trends' ? '#007bff' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Market Trends ({marketTrends.length})
        </button>
        <button
          onClick={() => setActiveTab('fintech')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'fintech' ? '#007bff' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Fintech News ({fintechNews.length})
        </button>
        <button
          onClick={fetchAllData}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginLeft: 'auto'
          }}
        >
          Refresh
        </button>
      </div>

      {activeTab === 'products' && (
        <div>
          <h2>New Products & Services</h2>
          <div style={{ display: 'grid', gap: '15px' }}>
            {newProducts.map((product) => (
              <div key={product._id} style={{
                border: '1px solid #ddd',
                padding: '15px',
                borderRadius: '8px',
                backgroundColor: '#f9f9f9'
              }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#007bff' }}>
                  {product.product_name}
                </h3>
                <p><strong>Banks:</strong> {product.bank?.join(', ') || 'N/A'}</p>
                <p><strong>Segment:</strong> {product.product_segment}</p>
                <p><strong>Category:</strong> {product.product_category}</p>
                <p><strong>Description:</strong> {product.description}</p>
                <p><strong>Published:</strong> {formatDate(product.date_published)}</p>
                <p><strong>Source:</strong> {product.source_type}</p>
                {product.source_url && (
                  <p><a href={product.source_url} target="_blank" rel="noopener noreferrer">View Source</a></p>
                )}
                <p style={{ fontSize: '12px', color: '#666' }}>
                  PDF: {product.pdf_file_name} | Timestamp: {formatDate(product.timestamp)}
                </p>
              </div>
            ))}
            {newProducts.length === 0 && <p>No products found.</p>}
          </div>
        </div>
      )}

      {activeTab === 'trends' && (
        <div>
          <h2>Banking Market Trends</h2>
          <div style={{ display: 'grid', gap: '15px' }}>
            {marketTrends.map((trend) => (
              <div key={trend._id} style={{
                border: '1px solid #ddd',
                padding: '15px',
                borderRadius: '8px',
                backgroundColor: '#f0f8ff'
              }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#28a745' }}>
                  {trend.title}
                </h3>
                <p><strong>Topic:</strong> {trend.topic_group}</p>
                <p><strong>Summary:</strong> {trend.summary}</p>
                <p><strong>Banks Related:</strong> {trend.bank_related?.join(', ') || 'N/A'}</p>
                <p><strong>Impact Level:</strong> {trend.impact_level}</p>
                <p><strong>Source:</strong> {trend.source_type}</p>
                <p><strong>Published:</strong> {formatDate(trend.published_date)}</p>
                {trend.source_url && (
                  <p><a href={trend.source_url} target="_blank" rel="noopener noreferrer">View Source</a></p>
                )}
                <p style={{ fontSize: '12px', color: '#666' }}>
                  PDF: {trend.pdf_file_name} | Timestamp: {formatDate(trend.timestamp)}
                </p>
              </div>
            ))}
            {marketTrends.length === 0 && <p>No market trends found.</p>}
          </div>
        </div>
      )}

      {activeTab === 'fintech' && (
        <div>
          <h2>Fintech News</h2>
          <div style={{ display: 'grid', gap: '15px' }}>
            {fintechNews.map((news) => (
              <div key={news._id} style={{
                border: '1px solid #ddd',
                padding: '15px',
                borderRadius: '8px',
                backgroundColor: '#fff8dc'
              }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#ff6347' }}>
                  {news.title}
                </h3>
                <p><strong>Topic:</strong> {news.fintech_topic}</p>
                <p><strong>Summary:</strong> {news.summary}</p>
                <p><strong>Organization:</strong> {news.organization}</p>
                <p><strong>Impact Area:</strong> {news.impact_area}</p>
                <p><strong>Source:</strong> {news.source_type}</p>
                <p><strong>Published:</strong> {formatDate(news.published_date)}</p>
                {news.source_url && (
                  <p><a href={news.source_url} target="_blank" rel="noopener noreferrer">View Source</a></p>
                )}
                <p style={{ fontSize: '12px', color: '#666' }}>
                  PDF: {news.pdf_file_name} | Timestamp: {formatDate(news.timestamp)}
                </p>
              </div>
            ))}
            {fintechNews.length === 0 && <p>No fintech news found.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
