# das-backend/apps/dam-service/tests/test_scraping_processor.py
import pytest
from unittest.mock import Mock, AsyncMock, patch
from bullmq import Job
from apps.dam_service.jobs.scraping_processor import ScrapingProcessor
from apps.dam_service.dto.scrape_web_request import ScrapeWebRequestDto

@pytest.fixture
def mock_prisma():
    """Mock PrismaService"""
    mock = Mock()
    mock.scrapingJob.update = AsyncMock()
    mock.scrapingJob.findUnique = AsyncMock()
    return mock

@pytest.fixture
def mock_web_scraper():
    """Mock WebScraperService"""
    mock = Mock()
    mock.initialize = AsyncMock()
    mock.destroy = AsyncMock()
    mock.scrapeUrl = AsyncMock(return_value=[
        Mock(id='media1', sourceUrl='http://example.com/img1.jpg'),
        Mock(id='media2', sourceUrl='http://example.com/img2.jpg'),
    ])
    return mock

@pytest.fixture
def scraping_processor(mock_prisma, mock_web_scraper):
    """Create ScrapingProcessor instance with mocked dependencies"""
    processor = ScrapingProcessor(
        prisma=mock_prisma,
        webScraper=mock_web_scraper,
        syntheticData=Mock(),
    )
    return processor

@pytest.mark.asyncio
async def test_handle_scrape_web_success(scraping_processor, mock_prisma, mock_web_scraper):
    """Test successful web scraping job processing"""
    # Arrange
    job_data = ScrapeWebRequestDto(
        urls=['http://example.com/gallery'],
        rules={'selector': 'img', 'depth': 1},
        priority=5,
    )
    
    job = Mock(spec=Job)
    job.id = 'test-job-123'
    job.data = job_data
    job.updateProgress = AsyncMock()
    
    # Act
    result = await scraping_processor.handleScrapeWeb(job)
    
    # Assert
    assert result['jobId'] == 'test-job-123'
    assert result['totalImages'] == 2
    assert mock_web_scraper.initialize.called
    assert mock_web_scraper.destroy.called
    assert mock_web_scraper.scrapeUrl.called
    
    # Verify job status updates
    status_calls = mock_prisma.scrapingJob.update.call_args_list
    assert any(call[1]['data']['status'] == 'ACTIVE' for call in status_calls)
    assert any(call[1]['data']['status'] == 'COMPLETED' for call in status_calls)

@pytest.mark.asyncio
async def test_handle_scrape_web_failure(scraping_processor, mock_prisma, mock_web_scraper):
    """Test web scraping job failure handling"""
    # Arrange
    job_data = ScrapeWebRequestDto(
        urls=['http://example.com/gallery'],
        rules={'selector': 'img'},
    )
    
    job = Mock(spec=Job)
    job.id = 'test-job-456'
    job.data = job_data
    job.updateProgress = AsyncMock()
    
    # Simulate scraping failure
    mock_web_scraper.scrapeUrl.side_effect = Exception('Network error')
    
    # Act & Assert
    with pytest.raises(Exception, match='Network error'):
        await scraping_processor.handleScrapeWeb(job)
    
    # Verify failure status update
    status_calls = mock_prisma.scrapingJob.update.call_args_list
    assert any(
        call[1]['data']['status'] == 'FAILED' and 
        'Network error' in call[1]['data'].get('errorMessage', '')
        for call in status_calls
    )

@pytest.mark.asyncio
async def test_progress_updates(scraping_processor, mock_prisma, mock_web_scraper):
    """Test that job progress is updated correctly"""
    # Arrange
    job_data = ScrapeWebRequestDto(
        urls=['http://example.com/1', 'http://example.com/2', 'http://example.com/3'],
        rules={'selector': 'img'},
    )
    
    job = Mock(spec=Job)
    job.id = 'test-job-789'
    job.data = job_data
    job.updateProgress = AsyncMock()
    
    # Act
    await scraping_processor.handleScrapeWeb(job)
    
    # Assert
    # Should have called updateProgress for each URL
    progress_calls = job.updateProgress.call_args_list
    assert len(progress_calls) == 3
    assert progress_calls[0][0][0] == 33  # First URL: 33%
    assert progress_calls[1][0][0] == 67  # Second URL: 67%
    assert progress_calls[2][0][0] == 100  # Third URL: 100%

# Test configuration file
# das-backend/pytest.ini
[pytest]
testpaths = apps packages
python_files = test_*.py
python_classes = Test*
python_functions = test_*
asyncio_mode = auto
addopts = 
    --verbose
    --cov=apps
    --cov=packages
    --cov-report=html
    --cov-report=term-missing
    --cov-fail-under=85