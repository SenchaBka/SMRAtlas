import pandas as pd
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
from sklearn.pipeline import make_pipeline
import json
from textwrap import wrap

from statsmodels.tsa.holtwinters import ExponentialSmoothing

# Load yearly demand — drop partial years (2002 and 2026)
df = pd.read_csv('./Energy Demand Analysis/Ontario/data/Yearly_Market_Demand_2002-2026.csv')
df = df[(df['Year'] >= 2003) & (df['Year'] <= 2025)].copy()
df['Year'] = df['Year'].astype(int)
df['TWh'] = df['Total_Market_Demand'] / 1e6  # MWh → TWh

# Create scenario forecast (2025-2050 at +1.9%/yr growth)
base_2025 = df.loc[df['Year'] == 2025, 'TWh'].values[0]
future_years = np.arange(2025, 2051)
high_rate = 0.019

rows = []
for year in range(2025, 2051):
    row = {'Year': year, 'Demand (TWh)': round(base_2025 * (1 + high_rate) ** (year - 2025), 1)}
    rows.append(row)

summary_by_year = pd.DataFrame(rows)

# Load Electricity Generation by Source
gen_source_df = pd.read_excel('./Energy Demand Analysis/Ontario/data/Electricity_Generation_By_Source_Ontario.xlsx')
gen_source_df = gen_source_df.set_index(gen_source_df.columns[0])

# Extract year columns
year_columns = [col for col in gen_source_df.columns if isinstance(col, (int, float)) or str(col).isdigit()]
years = sorted([int(col) for col in year_columns])
sources = gen_source_df.index.tolist()

# Convert to TWh
gen_source_twh = gen_source_df[year_columns] / 1000

# Combine historical demand (2005-2024) with forecasted demand (2025-2050)
historical_demand = df[(df['Year'] >= 2005) & (df['Year'] <= 2024)][['Year', 'TWh']].copy()
historical_demand.columns = ['Year', 'Demand (TWh)']

forecast_demand = summary_by_year[summary_by_year['Year'] >= 2025].copy()

combined_demand = pd.concat([historical_demand, forecast_demand], ignore_index=True)

# Interactive Plotly Chart: Generation by Source + Demand Forecast
fig = go.Figure()

# Define colors for Plotly chart
colors_map_plotly = {
    'Hydro / Wave / Tidal': '#5B9BD5',
    'Wind': '#B0C4DE',
    'Biomass / Geothermal': '#8B9D6F',
    'Solar': '#F0B233',
    'Uranium': '#7CB342',
    'Natural Gas': '#A9A9A9',
    'Oil': '#CD5C5C',
    'Coal & Coke': '#000000'
}

# Pre-assign consistent colors for all sources
source_colors_plotly = []
for source in sources:
    if source in colors_map_plotly:
        source_colors_plotly.append(colors_map_plotly[source])
    else:
        # Fallback: use a muted gray for unknown sources
        source_colors_plotly.append('#808080')

# Add stacked bars for each generation source
for idx, source in enumerate(sources):
    year_columns = [col for col in gen_source_df.columns if isinstance(col, (int, float)) or str(col).isdigit()]
    values = gen_source_twh.loc[source, year_columns].values
    fig.add_trace(go.Bar(
        x=years,
        y=values,
        name=source,
        marker_color=source_colors_plotly[idx],
        hovertemplate='<b>%{fullData.name}</b><br>Generation: %{y:.2f} TWh<extra></extra>'
    ))

# Add demand line overlay (General Points)
fig.add_trace(go.Scatter(
    x=combined_demand['Year'],
    y=combined_demand['Demand (TWh)'],
    mode='lines+markers',
    name='Demand (General)',
    line=dict(color='red', width=3),
    marker=dict(size=6, color='red'),
    hovertemplate='<b>Demand</b><br>Demand: %{y:.2f} TWh<extra></extra>'
))

# Load nuclear events to get nuclear event years
with open('./Energy Demand Analysis/Ontario/data/historical_events_nuclear.json', 'r') as f:
    nuclear_events = {item['year']: item['event'] for item in json.load(f)}

# Add nuclear-specific points ONLY on years with nuclear events, at TOP of uranium bar
if nuclear_events:
    year_columns = [col for col in gen_source_df.columns if isinstance(col, (int, float)) or str(col).isdigit()]
    
    # Calculate cumulative heights for uranium bar (sum of all bars below + uranium)
    cumulative = np.zeros(len(years))
    uranium_idx = None
    for idx, source in enumerate(sources):
        values = gen_source_twh.loc[source, year_columns].values
        if source == 'Uranium':
            uranium_idx = idx
            cumulative += values
        elif uranium_idx is None:
            cumulative += values
    
    nuclear_x = []
    nuclear_y = []
    nuclear_names = []
    for year, event in nuclear_events.items():
        if year in years:
            year_idx = years.index(year)
            nuclear_x.append(year)
            nuclear_y.append(cumulative[year_idx])
            formatted_event = f"<b>{year}</b><br>" + "<br>".join(wrap(event, width=60))
            nuclear_names.append(formatted_event)
    
    fig.add_trace(go.Scatter(
        x=nuclear_x,
        y=nuclear_y,
        mode='markers',
        name='Nuclear Events',
        marker=dict(size=7, color='#2E7D32', symbol='diamond'),
        hovertemplate='%{text}<extra></extra>',
        text=nuclear_names,
        showlegend=True
    ))

# Add shaded regions for historical and forecast
fig.add_vrect(x0=2005, x1=2025, fillcolor='lightblue', opacity=0.1, layer='below', line_width=0)
fig.add_vrect(x0=2025, x1=2050.5, fillcolor='lightcoral', opacity=0.1, layer='below', line_width=0)

# Add vertical line at 2025 boundary
fig.add_vline(x=2025, line_dash='dot', line_color='darkred', line_width=2, opacity=0.7)

# Add annotations closer to the boundary line
max_demand = combined_demand['Demand (TWh)'].max()

fig.add_annotation(
    x=2018, y=max_demand * 0.90,
    text='Historical Data',
    showarrow=False,
    font=dict(size=12, color='darkred'),
    bgcolor='white',
    bordercolor='darkred',
    borderwidth=1,
    borderpad=4
)

fig.add_annotation(
    x=2032, y=max_demand * 0.90,
    text='Forecast (1.9%/yr growth)',
    showarrow=False,
    font=dict(size=12, color='darkred'),
    bgcolor='white',
    bordercolor='darkred',
    borderwidth=1,
    borderpad=4
)

# Update layout
fig.update_layout(
    title='Ontario Electricity Generation by Source + Demand Forecast',
    xaxis_title='Year',
    yaxis_title='Generation & Demand (TWh)',
    barmode='stack',
    hovermode='closest',
    template='plotly_white',
    width=1400,
    height=750,
    font=dict(size=11),
    legend=dict(
        yanchor='top',
        y=0.99,
        xanchor='left',
        x=0.01,
        bgcolor='rgba(255, 255, 255, 0.8)',
        bordercolor='gray',
        borderwidth=1
    ),
    xaxis=dict(
        tickmode='linear',
        tick0=2005,
        dtick=5,
        gridwidth=1,
        gridcolor='lightgray'
    ),
    yaxis=dict(
        gridwidth=1,
        gridcolor='lightgray'
    )
)

# Load historical events from JSON file
with open('./Energy Demand Analysis/Ontario/data/historical_events.json', 'r') as f:
    historical_events = {item['year']: item['event'] for item in json.load(f)}

# Add event markers as scatter trace
event_years = []
event_names = []
event_y_positions = []

min_demand = combined_demand['Demand (TWh)'].min()

for year, event in historical_events.items():
    if 2005 <= year <= 2050:
        event_years.append(year)
        # Format event text with word wrapping for better hover display
        formatted_event = f"<b>{year}</b><br>" + "<br>".join(wrap(event, width=60))
        event_names.append(formatted_event)
        event_y_positions.append(min_demand * 0.50)  # Position lower

fig.add_trace(go.Scatter(
    x=event_years,
    y=event_y_positions,
    mode='markers',
    name='Historical Events',
    marker=dict(
        size=6,
        color='darkred',
        symbol='diamond',
        line=dict(color='darkred', width=1)
    ),
    hovertemplate='%{text}<extra></extra>',
    text=event_names,
    showlegend=True
))

fig.show()
print("✓ Interactive Plotly chart generated successfully")

fig.write_html('./Energy Demand Analysis/Ontario/data/Generation_By_Source_With_Demand_Interactive.html')
print("✓ Chart saved to ./data/Generation_By_Source_With_Demand_Interactive.html")