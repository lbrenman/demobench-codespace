# Running the Local Jaeger Client

Send traces from your local machine to Jaeger running in your GitHub Codespace.

## Quick Setup (5 minutes)

### Step 1: Get Your Codespace URL

1. Open your Jaeger UI in a browser
2. Copy the URL from the address bar

Example URL:
```
https://orange-happiness-jjj4p7g7r2qw9g-16686.app.github.dev/search
```

3. Extract the **Codespace base** (the part before `-16686`):
```
orange-happiness-jjj4p7g7r2qw9g
```

### Step 2: Configure the Client

1. Open `simple_local_client.py` in a text editor
2. Update **line 13** with your Codespace base:

```python
CODESPACE_BASE = "orange-happiness-jjj4p7g7r2qw9g"  # ← PUT YOUR VALUE HERE
```

3. Save the file

### Step 3: Setup Python Environment

Open terminal and navigate to where you saved the client file:

```bash
# Create virtual environment (one time only)
python3 -m venv jaeger-venv

# Activate it
source jaeger-venv/bin/activate  # macOS/Linux
# OR
jaeger-venv\Scripts\activate     # Windows

# Install dependencies
pip install requests
```

### Step 4: Run the Client

```bash
python simple_local_client.py
```

You should see:
```
✅ Trace sent successfully!
✅ Trace sent successfully!
✅ Trace sent successfully!
```

### Step 5: View Your Traces

1. Go to your Jaeger UI
2. Select **"local-client"** from the Service dropdown
3. Click **"Find Traces"**
4. You should see 3 traces! 🎉

---

## Next Time You Run It

```bash
# Just activate and run
source jaeger-venv/bin/activate
python ultra_simple_client.py
```

---

## Troubleshooting

### No traces appearing?

**Check your CODESPACE_BASE:**
- Open `ultra_simple_client.py`
- Line 13 should match your Codespace URL
- Example: If UI is at `https://ABC-XYZ-123-16686.app.github.dev`
- Then use: `CODESPACE_BASE = "ABC-XYZ-123"`

**Verify Jaeger is running:**
- Open your Jaeger UI in a browser
- If it doesn't load, your Codespace might be stopped

### Connection errors?

Make sure port 4318 is forwarded:
1. In your Codespace, click the **"Ports"** tab
2. Look for port **4318**
3. Should show as "forwarded"

### "pip: command not found"?

Install Python first:
- **macOS**: `brew install python3`
- **Windows**: Download from [python.org](https://www.python.org/downloads/)
- **Linux**: `sudo apt install python3 python3-pip`

---

## Summary

1. ✏️ Update `CODESPACE_BASE` in `ultra_simple_client.py` (line 13)
2. 📦 Install: `pip install requests`
3. ▶️ Run: `python ultra_simple_client.py`
4. 👀 View traces in Jaeger UI under "local-client" service

That's it! 🚀
