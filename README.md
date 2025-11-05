# MatSplash Financial Calculator

A comprehensive financial management system for tracking earnings, expenses, salaries, material purchases, and profits for a purewater factory.

## Features

### Employee Management
- Support for three salary types:
  - **Fixed Salary**: Employees receiving a fixed monthly salary
  - **Commission Only**: Employees earning based on bags sold
  - **Both**: Employees receiving fixed salary plus commission

### Sales Tracking
- Record daily sales by driver
- Track bags sold (typically 300-800 bags per day)
- Automatic calculation of total revenue
- Price per bag tracking

### Expense Management
- **Fuel Expenses**: Daily fuel purchases
- **Driver Payments**: Payments based on trips
- **Material Purchases**: Track sachet rolls and packing nylon
- **Other Expenses**: Miscellaneous expenses

### Material Purchases
- **Sachet Rolls**: ₦31,000 per roll (450 bags capacity)
- **Packing Nylon**: ₦100,000 per package (5000 bags capacity)
- Automatic cost per bag calculation

### Salary Payments
- Calculate salaries based on employee type
- Support for daily, weekly, and monthly periods
- Commission calculation based on bags sold
- Fixed salary proration for partial periods

### Financial Reports
- **Daily Reports**: Track day-to-day financial performance
- **Weekly Reports**: Weekly financial summaries
- **Monthly Reports**: Monthly financial overview
- **Quarterly Reports**: Quarterly financial analysis
- **Yearly Reports**: Annual financial reports

### Dashboard
- Real-time financial overview
- Today's revenue and profit
- Expense breakdown
- Comparison with previous period
- Quick access to all features

### Analytics
- Revenue and expense trends
- Profit margin calculations
- Visual charts and graphs
- Historical data comparison

## Technology Stack

- **React 18** with TypeScript
- **Material-UI (MUI)** for modern UI components
- **Vite** for fast development and building
- **IndexedDB** for client-side data storage
- **Recharts** for data visualization
- **Date-fns** for date manipulation

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5179`

## Usage

### Adding Employees
1. Navigate to **Employees** from the sidebar
2. Click **Add Employee**
3. Fill in employee details:
   - Name, Email, Phone
   - Select salary type (Fixed, Commission, or Both)
   - Enter fixed salary (if applicable)
   - Enter commission rate percentage (if applicable)

### Recording Sales
1. Navigate to **Sales**
2. Click **Record Sale**
3. Select driver from employees or enter driver name
4. Enter number of bags sold
5. Enter price per bag
6. Select date and add notes if needed

### Adding Expenses
1. Navigate to **Expenses**
2. Click **Add Expense**
3. Select expense type (Fuel, Driver Payment, Material, Other)
4. Enter description and amount
5. Select date and add reference if needed

### Recording Material Purchases
1. Navigate to **Materials**
2. Click **Add Purchase**
3. Select material type (Sachet Roll or Packing Nylon)
4. Enter quantity and cost
5. Select purchase date

### Recording Salary Payments
1. Navigate to **Salaries**
2. Click **Record Payment**
3. Select employee (salary will auto-calculate)
4. Enter total bags sold (for commission employees)
5. Review calculated amounts
6. Select payment period and date

### Viewing Reports
1. Navigate to **Reports**
2. Select period type (Daily, Weekly, Monthly, Quarterly, Yearly)
3. Choose date range
4. View comprehensive financial report with charts

## Data Storage

All data is stored locally in your browser using IndexedDB. This means:
- No server required
- Data stays on your device
- Fast and responsive
- Works offline

**Note**: Clearing browser data will delete all stored information. Consider exporting important data regularly.

## Cost Structure

### Material Costs
- **Sachet Roll**: ₦31,000 per roll → ₦68.89 per bag (450 bags per roll)
- **Packing Nylon**: ₦100,000 per package → ₦20 per bag (5000 bags per package)
- **Total Material Cost per Bag**: ~₦88.89

### Typical Sales
- Drivers can sell between 300-800 bags per day
- Price per bag is configurable (default: ₦50)

## Development

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## License

Private project for MatSplash Factory

