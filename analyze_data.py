import json

with open('D:/Travel-Weather-Website/data/destinations.json', 'r') as f:
    destinations = json.load(f)

with open('D:/Travel-Weather-Website/data/districts.json', 'r') as f:
    districts = json.load(f)

# Analyze existing destinations by district
existing_by_district = {}
for d in destinations:
    dist = d.get('district')
    if dist not in existing_by_district:
        existing_by_district[dist] = []
    existing_by_district[dist].append(d['id'])

print("=== Existing destinations by district ===")
for dist, ids in sorted(existing_by_district.items()):
    print(f"{dist}: {len(ids)} - {ids}")

print("\n=== Districts with 0 destinations ===")
for dist in districts:
    if dist['destinationCount'] == 0:
        print(f"  {dist['name']} ({dist['division']})")

print("\n=== Total destinations:", len(destinations))
print("Total districts:", len(districts))

# Also check for duplicates
ids = [d['id'] for d in destinations]
duplicates = [id for id in set(ids) if ids.count(id) > 1]
if duplicates:
    print(f"\n=== DUPLICATE IDs: {duplicates} ===")
else:
    print("\n=== No duplicate IDs ===")

# Check coordinates
invalid_coords = []
for d in destinations:
    lat = d.get('latitude')
    lng = d.get('longitude')
    if lat is None or lng is None:
        invalid_coords.append(f"{d['id']}: missing coords")
    elif not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
        invalid_coords.append(f"{d['id']}: invalid type")
    elif lat < -90 or lat > 90 or lng < -180 or lng > 180:
        invalid_coords.append(f"{d['id']}: out of range {lat},{lng}")

if invalid_coords:
    print(f"\n=== INVALID COORDINATES: {invalid_coords} ===")
else:
    print("\n=== All coordinates valid ===")