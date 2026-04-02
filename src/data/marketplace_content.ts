export const marketplaceContent = JSON.parse(`{
  "agents": [
    {
      "title": "ServiceNow",
      "description": "A cloud platform for **IT Service and Operations Management (ITSM/ITOM)**. It automates workflows, manages service requests, and centralizes enterprise processes."
    },
    {
      "title": "Inventory",
      "description": "Manages the complete lifecycle of all physical and logical assets. It tracks configurations, location, status, and dependencies essential for **maintenance and service planning**."
    },
    {
      "title": "Billing Operations",
      "description": "Handles generating, processing, and distributing customer invoices. It ensures **accurate rating, payment processing,** and revenue reconciliation based on business rules."
    },
    {
      "title": "SOC/NOC Operations",
      "description": "Combines security and network operations centers. It monitors security, ensures **network health and availability**, detects incidents, and manages fault resolution."
    },
    {
      "title": "Service Delivery",
      "description": "Manages the end-to-end process of providing services, from request to fulfillment. It tracks **SLAs** and coordinates resources to ensure efficient and timely service provisioning."
    },
    {
      "title": "Fault Mgmt",
      "description": "Detects, isolates, resolves, and tracks system or network faults to ensure uninterrupted service. It minimizes downtime by performing **root cause analysis and corrective actions**."
    },
    {
      "title": "Anomaly Mgmt",
      "description": "Uses machine learning to identify unusual patterns or behaviors in operational data. This proactive approach helps in **early detection of security threats** or performance issues."
    },
    {
      "title": "CPQ",
      "description": "**Configure, Price, Quote** systems automate creating accurate, complex, and customized sales proposals. It helps sales teams define product bundles and generate quotes efficiently."
    },
    {
      "title": "Lead Prospect Customer",
      "description": "Manages the initial stages of the sales pipeline, from identifying and qualifying leads to onboarding new customers. It supports **tracking engagement and nurturing relationships**."
    },
    {
      "title": "Sales & Marketing",
      "description": "Covers strategic activities to promote offerings and drive revenue. This includes managing campaigns, analyzing market data, and defining **sales strategies** across the customer journey."
    }
  ],
  "mcp_servers": [
    {
      "title": "ServiceNow TSOM",
      "description": "Telecom Service Operations Management. It manages service quality, correlates faults with customer impact, and automates **resolution of complex network issues**."
    },
    {
      "title": "ServiceNow SOM",
      "description": "Service Order Management. It manages fulfilling customer orders for new or changed services, ensuring accurate **order decomposition, orchestration, and tracking**."
    },
    {
      "title": "ServiceNow TSM",
      "description": "Telecom Service Management. It extends ITSM for telecom, streamlining service desk operations, **incident handling, and field service** for network infrastructure."
    },
    {
      "title": "ServiceNow TNI",
      "description": "Telecom Network Inventory. It provides a unified, accurate view of all **network resources and service inventory** for fulfillment and assurance activities."
    },
    {
      "title": "Kubernetes K8S",
      "description": "An open-source system for automating the **deployment, scaling, and management of containerized applications** (container orchestration)."
    },
    {
      "title": "NetBox",
      "description": "An open-source **Source of Truth for network infrastructure** and IP address management (IPAM). It's a comprehensive inventory and documentation tool."
    },
    {
      "title": "Service Ordering",
      "description": "The system and process that handles customer requests for new services, modifications, or cancellations. It **initiates service fulfillment workflows**."
    },
    {
      "title": "Product Ordering",
      "description": "The business process where customers order defined products. It validates the order, manages configurations, and passes details to **fulfillment and billing**."
    },
    {
      "title": "Product Catalog",
      "description": "A centralized repository of all product/service definitions, including pricing, characteristics, and bundling rules. It's the **single source of truth for sales**."
    },
    {
      "title": "ETSI NFV-MANO",
      "description": "The framework for **Management and Orchestration of Network Functions Virtualization** (NFV). It governs the lifecycle of virtualized network functions (VNFs)."
    },
    {
      "title": "Oracle BRM",
      "description": "**Billing and Revenue Management** solution for subscription, usage, and event-based pricing, billing, and revenue collection. Supports complex rating."
    },
    {
      "title": "Service Inventory",
      "description": "Tracks details of all **active and provisioned services** for customers, linking them to underlying network resources for assurance and billing."
    },
    {
      "title": "Product Inventory",
      "description": "A record of the physical and logical components that constitute marketable products. It tracks **product instances and their configurations**."
    },
    {
      "title": "Resource Inventory",
      "description": "Maintains a real-time database of all **network and IT resources** (physical and logical). Essential for capacity planning and service assurance."
    },
    {
      "title": "Network Exposure Function",
      "description": "A 3GPP function in 5G that securely **exposes network capabilities** and services to external third-party applications, enabling new business models."
    },
    {
      "title": "Customer Account",
      "description": "The master record containing a customer's personal details, contact information, service history, and **relationship hierarchy** for comprehensive management."
    },
    {
      "title": "Billing Accounts",
      "description": "Contains financial and payment information associated with a customer. It **aggregates charges, manages payment methods**, and handles credit limits."
    },
    {
      "title": "3GPP",
      "description": "The 3rd Generation Partnership Project; a collaboration that develops and maintains **global technical specifications for 3G, 4G, and 5G** mobile communications."
    },
    {
      "title": "Azure",
      "description": "Microsoft's public cloud computing platform. It offers a vast array of services for **computing, analytics, storage,** and networking for application hosting."
    },
    {
      "title": "GCP",
      "description": "Google Cloud Platform. A suite of cloud computing services providing infrastructure for **computing, data storage, machine learning**, and networking."
    },
    {
      "title": "Cisco NE",
      "description": "Cisco **Network Elements** (NE), referring to the hardware and software devices like routers, switches, and firewalls that form core network infrastructure."
    },
    {
      "title": "Juniper NE",
      "description": "Juniper **Network Elements** (NE), encompassing their networking hardware and software products, like high-performance routers and security devices."
    },
    {
      "title": "OpenShift",
      "description": "Red Hat's enterprise Kubernetes platform, providing a secure environment for **developing, deploying, and managing container-based applications** at scale."
    },
    {
      "title": "AWS",
      "description": "Amazon Web Services. The world's most comprehensive cloud platform, offering hundreds of services for **building scalable cloud solutions** globally."
    },
    {
      "title": "CI/CD",
      "description": "**Continuous Integration/Continuous Delivery**. A methodology that automates the software delivery process, ensuring frequent and reliable **code integration and deployment**."
    }
  ]
}`)