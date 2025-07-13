import asyncio
import aiohttp
import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict


@dataclass
class RateLimitResult:
    timestamp: float
    status: int
    response_time: float
    headers: Dict[str, str]
    is_rate_limited: bool


class RateLimitTester:
    def __init__(self, base_url="http://localhost:8080"):
        self.base_url = base_url
        self.results = defaultdict(list)

    async def burst_test(self, burst_size=25, delay_between_bursts=5):
        """Test burst rate limiting - send many requests quickly"""
        print(f"🚀 Starting burst test: {burst_size} requests in quick succession")
        print(f"Target: {self.base_url}")
        print("=" * 60)

        timeout = aiohttp.ClientTimeout(total=10)
        connector = aiohttp.TCPConnector(limit=100)

        async with aiohttp.ClientSession(
            timeout=timeout, connector=connector
        ) as session:

            # Send burst of requests
            tasks = []
            start_time = time.time()

            for i in range(burst_size):
                task = self.make_request(session, f"burst_{i}", start_time)
                tasks.append(task)

            # Execute all requests concurrently
            await asyncio.gather(*tasks)

            print(f"\n⏰ Waiting {delay_between_bursts}s before next burst...")
            await asyncio.sleep(delay_between_bursts)

            # Send another burst to test recovery
            print(f"🔄 Sending second burst after cooldown...")
            tasks = []
            start_time = time.time()

            for i in range(burst_size):
                task = self.make_request(session, f"recovery_{i}", start_time)
                tasks.append(task)

            await asyncio.gather(*tasks)

    async def sustained_test(self, duration_seconds=60, requests_per_second=10):
        """Test sustained rate limiting over time"""
        print(
            f"⏱️ Starting sustained test: {requests_per_second} req/s for {duration_seconds}s"
        )
        print(f"Target: {self.base_url}")
        print("=" * 60)

        timeout = aiohttp.ClientTimeout(total=10)
        connector = aiohttp.TCPConnector(limit=100)

        async with aiohttp.ClientSession(
            timeout=timeout, connector=connector
        ) as session:

            start_time = time.time()
            request_count = 0
            interval = 1.0 / requests_per_second

            while time.time() - start_time < duration_seconds:
                await self.make_request(
                    session, f"sustained_{request_count}", start_time
                )
                request_count += 1
                await asyncio.sleep(interval)

                if request_count % 50 == 0:
                    elapsed = time.time() - start_time
                    print(f"📊 {request_count} requests sent in {elapsed:.1f}s")

    async def concurrent_users_test(self, num_users=20, requests_per_user=10):
        """Test rate limiting with multiple concurrent users"""
        print(
            f"👥 Starting concurrent users test: {num_users} users, {requests_per_user} req/user"
        )
        print(f"Target: {self.base_url}")
        print("=" * 60)

        tasks = []
        for user_id in range(num_users):
            task = self.simulate_user(user_id, requests_per_user)
            tasks.append(task)

        await asyncio.gather(*tasks)

    async def simulate_user(self, user_id, num_requests):
        """Simulate a user making requests"""
        timeout = aiohttp.ClientTimeout(total=10)
        connector = aiohttp.TCPConnector(limit=100)

        async with aiohttp.ClientSession(
            timeout=timeout, connector=connector
        ) as session:

            start_time = time.time()
            for i in range(num_requests):
                await self.make_request(session, f"user_{user_id}_req_{i}", start_time)
                await asyncio.sleep(0.1)  # Small delay between requests

    async def make_request(self, session, request_id, start_time):
        """Make a single request and record the result"""
        try:
            request_start = time.time()

            # Use a simple endpoint that should always work
            async with session.get(f"{self.base_url}/health") as resp:
                request_end = time.time()
                response_time = request_end - request_start

                # Extract rate limit headers
                headers = {}
                for header_name in resp.headers:
                    if (
                        "ratelimit" in header_name.lower()
                        or "retry-after" in header_name.lower()
                    ):
                        headers[header_name] = resp.headers[header_name]

                # Check if request was rate limited
                is_rate_limited = resp.status == 429

                result = RateLimitResult(
                    timestamp=time.time() - start_time,
                    status=resp.status,
                    response_time=response_time,
                    headers=headers,
                    is_rate_limited=is_rate_limited,
                )

                self.results[request_id].append(result)

                # Log rate limited requests
                if is_rate_limited:
                    retry_after = headers.get("retry-after", "unknown")
                    print(
                        f"🚫 Rate limited - {request_id} (retry after: {retry_after})"
                    )
                elif resp.status != 200:
                    print(f"❌ Error - {request_id} (status: {resp.status})")

        except Exception as e:
            print(f"💥 Request failed - {request_id}: {e}")

    def print_results(self):
        """Print detailed rate limiting test results"""
        print("\n" + "=" * 60)
        print("📊 RATE LIMITING TEST RESULTS")
        print("=" * 60)

        # Flatten all results
        all_results = []
        for request_results in self.results.values():
            all_results.extend(request_results)

        if not all_results:
            print("No results to display")
            return

        # Sort by timestamp
        all_results.sort(key=lambda x: x.timestamp)

        # Calculate statistics
        total_requests = len(all_results)
        rate_limited_requests = sum(1 for r in all_results if r.is_rate_limited)
        successful_requests = sum(1 for r in all_results if r.status == 200)
        error_requests = sum(
            1 for r in all_results if r.status >= 400 and r.status != 429
        )

        print(f"Total Requests: {total_requests}")
        print(f"Successful (200): {successful_requests}")
        print(f"Rate Limited (429): {rate_limited_requests}")
        print(f"Other Errors: {error_requests}")
        print(
            f"Rate Limit Percentage: {(rate_limited_requests/total_requests)*100:.1f}%"
        )

        # Response time stats
        response_times = [r.response_time for r in all_results]
        if response_times:
            response_times.sort()
            avg_response_time = sum(response_times) / len(response_times)
            p50 = response_times[len(response_times) // 2]
            p95 = response_times[int(len(response_times) * 0.95)]
            p99 = response_times[int(len(response_times) * 0.99)]

            print(f"\nResponse Time Statistics:")
            print(f"  Average: {avg_response_time:.3f}s")
            print(f"  P50: {p50:.3f}s")
            print(f"  P95: {p95:.3f}s")
            print(f"  P99: {p99:.3f}s")

        # Timeline analysis
        print(f"\n⏰ Timeline Analysis:")
        self.print_timeline_analysis(all_results)

        # Rate limit headers analysis
        self.print_rate_limit_headers(all_results)

    def print_timeline_analysis(self, results):
        """Print timeline of rate limiting events"""
        rate_limited_events = [r for r in results if r.is_rate_limited]

        if not rate_limited_events:
            print("  No rate limiting detected")
            return

        print(f"  First rate limit: {rate_limited_events[0].timestamp:.2f}s")
        print(f"  Last rate limit: {rate_limited_events[-1].timestamp:.2f}s")

        # Group by time windows
        time_windows = defaultdict(int)
        for result in rate_limited_events:
            window = int(result.timestamp // 5) * 5  # 5-second windows
            time_windows[window] += 1

        print(f"  Rate limits by 5s windows:")
        for window in sorted(time_windows.keys()):
            print(f"    {window}-{window+5}s: {time_windows[window]} rate limits")

    def print_rate_limit_headers(self, results):
        """Analyze rate limit headers"""
        print(f"\n📋 Rate Limit Headers Analysis:")

        headers_found = set()
        for result in results:
            headers_found.update(result.headers.keys())

        if not headers_found:
            print("  No rate limit headers detected")
            return

        print(f"  Headers found: {', '.join(sorted(headers_found))}")

        # Show some example headers
        rate_limited_with_headers = [
            r for r in results if r.is_rate_limited and r.headers
        ]
        if rate_limited_with_headers:
            print(f"  Example rate limit response headers:")
            example = rate_limited_with_headers[0]
            for header, value in example.headers.items():
                print(f"    {header}: {value}")


async def main():
    tester = RateLimitTester(base_url="http://localhost:8080")

    print("🔧 Rate Limiting Test Suite")
    print("=" * 60)

    while True:
        print("\nSelect test type:")
        print("1. Burst Test (send many requests quickly)")
        print("2. Sustained Test (steady rate over time)")
        print("3. Concurrent Users Test (multiple users)")
        print("4. All Tests")
        print("5. Exit")

        choice = input("\nEnter your choice (1-5): ").strip()

        if choice == "1":
            await tester.burst_test(burst_size=25, delay_between_bursts=5)
        elif choice == "2":
            await tester.sustained_test(duration_seconds=30, requests_per_second=15)
        elif choice == "3":
            await tester.concurrent_users_test(num_users=10, requests_per_user=15)
        elif choice == "4":
            print("\n🔄 Running all tests...")
            await tester.burst_test(burst_size=20, delay_between_bursts=3)
            await asyncio.sleep(2)
            await tester.sustained_test(duration_seconds=20, requests_per_second=12)
            await asyncio.sleep(2)
            await tester.concurrent_users_test(num_users=8, requests_per_user=10)
        elif choice == "5":
            print("👋 Goodbye!")
            break
        else:
            print("❌ Invalid choice. Please try again.")
            continue

        tester.print_results()

        # Clear results for next test
        tester.results.clear()

        input("\nPress Enter to continue...")


if __name__ == "__main__":
    asyncio.run(main())
