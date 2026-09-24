/**
 * 25 destinations with rough estimates. Edit here, or override from the /admin page.
 * Format: [Name, Region, Vibes, Pace, MinDays, IdealDays, DailyCost (₹/person/day),
 *          BestMonths, Tags, [[one-way hrs, ₹ round-trip] per city in CITIES order]]
 */

const CITIES = ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune'];

const DEST_SEED = [
  ['Goa', 'Goa', 'beach', 2, 3, 4, 3500, '10,11,12,1,2,3', 'nightlife,water-sports,cafes,food,crowded',
    [[4, 8000], [4, 8000], [5, 12000], [4, 8000], [4, 9000], [9, 3000]]],
  ['Gokarna', 'Karnataka', 'beach,nature', 1, 2, 3, 2500, '10,11,12,1,2,3', 'cafes,trekking,remote',
    [[8, 2500], [7, 9000], [8, 13000], [8, 9000], [8, 10000], [11, 3500]]],
  ['Pondicherry', 'Puducherry', 'beach,heritage', 1, 2, 3, 3000, '10,11,12,1,2,3', 'cafes,food,hot',
    [[7, 2500], [5, 10000], [6, 13000], [6, 9000], [3, 1200], [6, 10000]]],
  ['Varkala', 'Kerala', 'beach', 1, 3, 4, 3000, '10,11,12,1,2,3', 'cafes,water-sports,hot',
    [[5, 9000], [5, 11000], [6, 15000], [5, 10000], [5, 8000], [6, 11000]]],
  ['Alleppey', 'Kerala', 'nature', 1, 2, 3, 4000, '9,10,11,12,1,2,3', 'food,hot',
    [[5, 8000], [5, 10000], [6, 14000], [5, 9000], [5, 8000], [6, 10000]]],
  ['Andaman Islands', 'Andaman & Nicobar', 'beach,nature', 2, 5, 6, 5000, '11,12,1,2,3,4', 'water-sports,remote',
    [[6, 16000], [7, 18000], [7, 20000], [7, 17000], [4, 13000], [7, 18000]]],
  ['Coorg', 'Karnataka', 'mountains,nature', 1, 2, 3, 3500, '9,10,11,12,1,2,3', 'cafes,trekking,food',
    [[6, 2000], [7, 10000], [8, 14000], [8, 9000], [9, 8000], [8, 10000]]],
  ['Ooty & Coonoor', 'Tamil Nadu', 'mountains', 1, 2, 3, 3000, '10,11,12,1,2,3,4,5', 'crowded,long-roads',
    [[7, 2000], [8, 11000], [9, 14000], [8, 10000], [7, 3000], [8, 11000]]],
  ['Munnar', 'Kerala', 'mountains,nature', 1, 3, 4, 3000, '9,10,11,12,1,2,3', 'trekking,long-roads',
    [[8, 7000], [8, 11000], [9, 15000], [8, 10000], [8, 7000], [9, 11000]]],
  ['Wayanad', 'Kerala', 'mountains,nature', 2, 2, 3, 3000, '10,11,12,1,2,3,4,5', 'trekking,wildlife,adventure',
    [[6, 2000], [8, 11000], [9, 15000], [8, 10000], [9, 7000], [9, 11000]]],
  ['Chikmagalur', 'Karnataka', 'mountains,nature', 1, 2, 3, 3000, '9,10,11,12,1,2,3', 'trekking,cafes',
    [[5, 1800], [8, 9000], [8, 13000], [8, 9000], [8, 8000], [8, 9000]]],
  ['Hampi', 'Karnataka', 'heritage', 2, 2, 3, 2000, '10,11,12,1,2', 'adventure,cafes,hot,remote',
    [[7, 2000], [9, 5000], [9, 13000], [7, 2500], [10, 5000], [9, 3500]]],
  ['Udaipur', 'Rajasthan', 'heritage,city', 1, 2, 3, 3500, '9,10,11,12,1,2,3', 'food,cafes',
    [[5, 11000], [3, 8000], [3, 8000], [5, 11000], [5, 12000], [4, 9000]]],
  ['Jaipur', 'Rajasthan', 'heritage,city', 3, 2, 3, 3000, '10,11,12,1,2,3', 'food,shopping,crowded',
    [[4, 10000], [3, 7000], [5, 1500], [4, 9000], [4, 11000], [4, 8000]]],
  ['Jaisalmer', 'Rajasthan', 'heritage', 2, 3, 3, 3000, '11,12,1,2', 'adventure,remote,long-roads',
    [[7, 13000], [6, 11000], [6, 10000], [7, 13000], [8, 14000], [7, 12000]]],
  ['Rishikesh', 'Uttarakhand', 'mountains,nature', 2, 3, 4, 2500, '9,10,11,12,2,3,4', 'adventure,water-sports,spiritual,cafes,crowded',
    [[5, 11000], [5, 10000], [6, 1500], [5, 10000], [5, 12000], [5, 10000]]],
  ['Manali', 'Himachal Pradesh', 'mountains', 3, 4, 5, 3000, '3,4,5,6,9,10,11,12', 'adventure,trekking,cafes,cold,long-roads,crowded',
    [[8, 14000], [8, 13000], [12, 2500], [8, 13000], [9, 15000], [8, 13000]]],
  ['Dharamshala & McLeodganj', 'Himachal Pradesh', 'mountains', 2, 3, 4, 2500, '3,4,5,6,9,10,11', 'trekking,cafes,spiritual,cold',
    [[7, 14000], [7, 13000], [10, 2500], [7, 13000], [8, 15000], [7, 13000]]],
  ['Varanasi', 'Uttar Pradesh', 'heritage,city', 2, 2, 3, 2500, '10,11,12,1,2,3', 'spiritual,food,crowded',
    [[4, 10000], [4, 9000], [3, 7000], [4, 9000], [4, 10000], [4, 10000]]],
  ['Darjeeling', 'West Bengal', 'mountains', 2, 3, 4, 3000, '3,4,5,10,11,12', 'cafes,cold,long-roads',
    [[7, 13000], [7, 13000], [7, 12000], [7, 13000], [7, 13000], [7, 14000]]],
  ['Meghalaya', 'Meghalaya', 'nature,mountains', 3, 4, 5, 3500, '10,11,12,1,2,3,4', 'trekking,adventure,long-roads,remote',
    [[7, 14000], [7, 14000], [6, 13000], [7, 14000], [7, 14000], [8, 15000]]],
  ['Ladakh', 'Ladakh', 'mountains,nature', 3, 6, 7, 4500, '5,6,7,8,9', 'adventure,cold,remote,long-roads,altitude',
    [[6, 16000], [5, 14000], [4, 10000], [6, 15000], [6, 16000], [6, 15000]]],
  ['Bali', 'Indonesia', 'beach,nature', 2, 5, 6, 5000, '4,5,6,7,8,9,10', 'international,nightlife,water-sports,cafes',
    [[9, 28000], [10, 32000], [11, 34000], [10, 30000], [9, 28000], [11, 32000]]],
  ['Krabi & Phuket', 'Thailand', 'beach,city', 2, 5, 6, 5500, '11,12,1,2,3,4', 'international,nightlife,water-sports,food',
    [[7, 22000], [7, 22000], [7, 22000], [7, 22000], [6, 20000], [8, 24000]]],
  ['Hoi An & Da Nang', 'Vietnam', 'heritage,city,beach', 3, 5, 7, 4000, '2,3,4,5,6,7,8', 'international,food,cafes',
    [[9, 25000], [9, 26000], [8, 24000], [9, 25000], [9, 25000], [10, 27000]]]
];

module.exports = { CITIES, DEST_SEED };
