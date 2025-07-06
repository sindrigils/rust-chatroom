#!/usr/bin/env python3
"""
Advanced Load Balancer Tester
Simulates multiple users with different session patterns
"""

import asyncio
import aiohttp
import time
import random
import json
from collections import defaultdict


class LoadBalancerTester:
    def __init__(self, base_url="http://localhost:8080", num_users=10):
        self.base_url = base_url
        self.num_users = num_users
        self.results = defaultdict(list)

    async def create_user_session(self, session, user_id):
        """Create a user session with registration and login"""
        username = f"testuser{user_id}_{int(time.time())}"
        password = f"testpass{user_id}"

        try:
            # Register
            register_data = {"username": username, "password": password}
            async with session.post(
                f"{self.base_url}/api/v1/register", json=register_data
            ) as resp:
                register_status = resp.status
                print(f"👤 User {user_id} registration: {register_status}")

            # Login
            async with session.post(
                f"{self.base_url}/api/v1/login", json=register_data
            ) as resp:
                login_status = resp.status
                login_text = await resp.text()
                print(f"🔑 User {user_id} login: {login_status}")

                # Check if we got any auth tokens or session info
                if login_status == 200:
                    print(f"✅ User {user_id} logged in successfully")
                    # Add a small delay to ensure session is established
                    await asyncio.sleep(0.1)

            return register_status == 201 and login_status == 200

        except Exception as e:
            print(f"❌ User {user_id} session creation failed: {e}")
            return False

    async def make_authenticated_requests(self, session, user_id, num_requests=20):
        """Make multiple authenticated requests for a user"""
        success_count = 0

        for i in range(num_requests):
            try:
                start_time = time.time()
                async with session.get(f"{self.base_url}/api/v1/whoami") as resp:
                    end_time = time.time()
                    response_time = end_time - start_time

                    self.results[user_id].append(
                        {
                            "request_id": i,
                            "status": resp.status,
                            "response_time": response_time,
                            "timestamp": time.time(),
                        }
                    )

                    if resp.status == 200:
                        success_count += 1

                # Random delay between requests (0.1 to 0.5 seconds)
                await asyncio.sleep(random.uniform(0.1, 0.5))

            except Exception as e:
                print(f"❌ User {user_id} request {i} failed: {e}")

        print(f"✅ User {user_id}: {success_count}/{num_requests} successful requests")
        return success_count

    async def simulate_user(self, user_id):
        """Simulate a complete user session"""
        timeout = aiohttp.ClientTimeout(total=30)
        connector = aiohttp.TCPConnector(limit=100)

        async with aiohttp.ClientSession(
            timeout=timeout, connector=connector, cookie_jar=aiohttp.CookieJar()
        ) as session:

            print(f"👤 Starting simulation for user {user_id}")

            # Create user and login
            if await self.create_user_session(session, user_id):
                # Make authenticated requests
                await self.make_authenticated_requests(session, user_id)
            else:
                print(f"❌ User {user_id} failed to create session")

    async def run_test(self):
        """Run the complete load test"""
        print(f"🚀 Starting load test with {self.num_users} concurrent users")
        print(f"Target: {self.base_url}")
        print("=" * 60)

        start_time = time.time()

        # Create tasks for all users
        tasks = [self.simulate_user(i) for i in range(self.num_users)]

        # Run all users concurrently
        await asyncio.gather(*tasks)

        end_time = time.time()
        total_time = end_time - start_time

        self.print_results(total_time)

    def print_results(self, total_time):
        """Print test results and statistics"""
        print("\n" + "=" * 60)
        print("📊 LOAD TEST RESULTS")
        print("=" * 60)

        total_requests = sum(len(requests) for requests in self.results.values())
        successful_requests = sum(
            len([r for r in requests if r["status"] == 200])
            for requests in self.results.values()
        )

        if total_requests > 0:
            success_rate = (successful_requests / total_requests) * 100
            avg_response_time = (
                sum(
                    sum(r["response_time"] for r in requests)
                    for requests in self.results.values()
                )
                / total_requests
                if total_requests > 0
                else 0
            )

            print(f"Total Users: {self.num_users}")
            print(f"Total Requests: {total_requests}")
            print(f"Successful Requests: {successful_requests}")
            print(f"Success Rate: {success_rate:.2f}%")
            print(f"Average Response Time: {avg_response_time:.3f}s")
            print(f"Total Test Time: {total_time:.2f}s")
            print(f"Requests per Second: {total_requests/total_time:.2f}")

            # Response time distribution
            all_times = [
                r["response_time"]
                for requests in self.results.values()
                for r in requests
            ]
            if all_times:
                all_times.sort()
                p50 = all_times[len(all_times) // 2]
                p95 = all_times[int(len(all_times) * 0.95)]
                p99 = all_times[int(len(all_times) * 0.99)]

                print(f"\nResponse Time Percentiles:")
                print(f"  P50: {p50:.3f}s")
                print(f"  P95: {p95:.3f}s")
                print(f"  P99: {p99:.3f}s")

        print("\n💡 Check your load balancer logs to see server distribution!")


async def main():
    # You can adjust these parameters
    tester = LoadBalancerTester(
        base_url="http://localhost:8080", num_users=15  # Increase this for more load
    )

    await tester.run_test()


if __name__ == "__main__":
    asyncio.run(main())
