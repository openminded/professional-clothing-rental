flowchart TD
    Start[Start] --> SignIn[Sign In Page]
    SignIn --> Auth[Authenticate User]
    Auth --> Dashboard[Dashboard]
    Dashboard --> POS[POS Interface]
    Dashboard --> Inventory[Inventory Management]
    Dashboard --> Returns[Returns Interface]
    Dashboard --> Reports[Reporting Dashboard]
    POS --> Search[Search Inventory]
    Search --> AddCart[Add Items to Cart]
    AddCart --> SubmitRental[Submit Rental]
    SubmitRental --> API_Rental[POST /api/rentals]
    API_Rental --> DB_Rental[DB Transaction\nVerify availability and lock items\nCreate Rental and RentalItems\nUpdate status and record payment]
    DB_Rental --> POS
    Returns --> ReturnItems[Select Items to Return]
    ReturnItems --> SubmitReturn[Submit Return]
    SubmitReturn --> API_Return[POST /api/returns]
    API_Return --> DB_Return[DB Transaction\nUpdate item status\nCalculate late fees]
    DB_Return --> Returns
    Inventory --> CRUD[Perform CRUD Operations]
    CRUD --> API_Inventory[Call Inventory API]
    API_Inventory --> DB_Inventory[DB Operations\nCRUD on Inventory]
    DB_Inventory --> Inventory
    Reports --> API_Reports[GET /api/reports]
    API_Reports --> DB_Reports[Complex Queries\nAggregations and joins]
    DB_Reports --> Reports